using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Konscious.Security.Cryptography;

namespace StoneSoup.Server.Services;

public class AuthService
{
    private readonly string _accountsRoot;
    private readonly ConcurrentDictionary<string, string> _sessions = new(); // token -> namespace

    public AuthService(string assetRoot)
    {
        _accountsRoot = Path.Combine(assetRoot, "accounts");
        Directory.CreateDirectory(_accountsRoot);
    }

    public record AuthResult(bool Success, string? Namespace = null, string? Token = null, string? Error = null);

    public async Task<AuthResult> Register(string displayName, string password)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length < 2)
            return new AuthResult(false, Error: "Display name must be at least 2 characters");
        if (string.IsNullOrWhiteSpace(password) || password.Length < 4)
            return new AuthResult(false, Error: "Password must be at least 4 characters");

        // Sanitize display name for folder use
        var safeName = SanitizeName(displayName);
        if (string.IsNullOrEmpty(safeName))
            return new AuthResult(false, Error: "Invalid display name");

        // Check if display name already taken
        if (FindNamespaceByDisplayName(displayName) != null)
            return new AuthResult(false, Error: "Display name already taken");

        // Generate unique key prefix
        var keyPrefix = GenerateKeyPrefix();
        var namespaceName = $"{safeName}-{keyPrefix}";
        var namespaceDir = Path.Combine(_accountsRoot, namespaceName);

        Directory.CreateDirectory(namespaceDir);

        // Hash password with Argon2id
        var passwordHash = await HashPassword(password);

        // Write account.json
        var account = new AccountJson
        {
            DisplayName = displayName,
            Created = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Auth = new AuthJson { PasswordHash = passwordHash }
        };

        var json = JsonSerializer.Serialize(account, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        });
        await File.WriteAllTextAsync(Path.Combine(namespaceDir, "account.json"), json);

        // Create session token
        var token = GenerateToken();
        _sessions[token] = namespaceName;

        return new AuthResult(true, Namespace: namespaceName, Token: token);
    }

    public async Task<AuthResult> Login(string displayName, string password)
    {
        var namespaceDir = FindNamespaceByDisplayName(displayName);
        if (namespaceDir == null)
            return new AuthResult(false, Error: "Account not found");

        var accountPath = Path.Combine(namespaceDir, "account.json");
        if (!File.Exists(accountPath))
            return new AuthResult(false, Error: "Account not found");

        var json = await File.ReadAllTextAsync(accountPath);
        var account = JsonSerializer.Deserialize<AccountJson>(json, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        });

        if (account?.Auth?.PasswordHash == null)
            return new AuthResult(false, Error: "Account has no password set");

        var valid = await VerifyPassword(password, account.Auth.PasswordHash);
        if (!valid)
            return new AuthResult(false, Error: "Incorrect password");

        var namespaceName = Path.GetFileName(namespaceDir);
        var token = GenerateToken();
        _sessions[token] = namespaceName;

        return new AuthResult(true, Namespace: namespaceName, Token: token);
    }

    public (string Namespace, string DisplayName)? ValidateToken(string? token)
    {
        if (token == null || !_sessions.TryGetValue(token, out var namespaceName))
            return null;

        // Read display name from account.json
        var accountPath = Path.Combine(_accountsRoot, namespaceName, "account.json");
        if (!File.Exists(accountPath))
            return null;

        try
        {
            var json = File.ReadAllText(accountPath);
            var account = JsonSerializer.Deserialize<AccountJson>(json, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            });
            return (namespaceName, account?.DisplayName ?? namespaceName);
        }
        catch
        {
            return (namespaceName, namespaceName);
        }
    }

    public void RemoveToken(string token)
    {
        _sessions.TryRemove(token, out _);
    }

    private string? FindNamespaceByDisplayName(string displayName)
    {
        var safeName = SanitizeName(displayName).ToLowerInvariant();
        try
        {
            foreach (var dir in Directory.GetDirectories(_accountsRoot))
            {
                var folderName = Path.GetFileName(dir);
                // Namespace format: {name}-{6hexchars}
                var dashIdx = folderName.LastIndexOf('-');
                if (dashIdx < 1) continue;

                var namePart = folderName[..dashIdx].ToLowerInvariant();
                if (namePart == safeName)
                {
                    var accountPath = Path.Combine(dir, "account.json");
                    if (File.Exists(accountPath))
                    {
                        // Verify display_name matches (case-insensitive)
                        var json = File.ReadAllText(accountPath);
                        var account = JsonSerializer.Deserialize<AccountJson>(json, new JsonSerializerOptions
                        {
                            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
                        });
                        if (account?.DisplayName?.Equals(displayName, StringComparison.OrdinalIgnoreCase) == true)
                            return dir;
                    }
                }
            }
        }
        catch { }

        return null;
    }

    private static string SanitizeName(string name)
    {
        var sb = new StringBuilder();
        foreach (var c in name.ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(c) || c == '-' || c == '_')
                sb.Append(c);
        }
        return sb.ToString();
    }

    private string GenerateKeyPrefix()
    {
        var bytes = RandomNumberGenerator.GetBytes(3); // 3 bytes = 6 hex chars
        var prefix = Convert.ToHexString(bytes).ToLowerInvariant();

        // Ensure uniqueness
        while (Directory.Exists(Path.Combine(_accountsRoot, $"*-{prefix}")))
        {
            bytes = RandomNumberGenerator.GetBytes(3);
            prefix = Convert.ToHexString(bytes).ToLowerInvariant();
        }

        return prefix;
    }

    private static string GenerateToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private static async Task<string> HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);

        var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = 4,
            MemorySize = 65536, // 64 MB
            Iterations = 3
        };

        var hash = await argon2.GetBytesAsync(32);

        var saltB64 = Convert.ToBase64String(salt);
        var hashB64 = Convert.ToBase64String(hash);

        return $"argon2id$v=19$m=65536,t=3,p=4${saltB64}${hashB64}";
    }

    private static async Task<bool> VerifyPassword(string password, string storedHash)
    {
        // Parse: argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
        var parts = storedHash.Split('$');
        if (parts.Length != 5 || parts[0] != "argon2id")
            return false;

        var salt = Convert.FromBase64String(parts[3]);
        var expectedHash = Convert.FromBase64String(parts[4]);

        // Parse params
        var paramParts = parts[2].Split(',');
        var memory = 65536;
        var iterations = 3;
        var parallelism = 4;

        foreach (var p in paramParts)
        {
            var kv = p.Split('=');
            if (kv.Length == 2)
            {
                switch (kv[0])
                {
                    case "m": memory = int.Parse(kv[1]); break;
                    case "t": iterations = int.Parse(kv[1]); break;
                    case "p": parallelism = int.Parse(kv[1]); break;
                }
            }
        }

        var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = parallelism,
            MemorySize = memory,
            Iterations = iterations
        };

        var computedHash = await argon2.GetBytesAsync(32);

        return CryptographicOperations.FixedTimeEquals(computedHash, expectedHash);
    }

    private class AccountJson
    {
        public string DisplayName { get; set; } = "";
        public string Created { get; set; } = "";
        public AuthJson? Auth { get; set; }
        public ProfileJson? Profile { get; set; }
    }

    private class AuthJson
    {
        public string? PasswordHash { get; set; }
        public string? PublicKey { get; set; }
    }

    private class ProfileJson
    {
        public string? HomeServer { get; set; }
    }
}
