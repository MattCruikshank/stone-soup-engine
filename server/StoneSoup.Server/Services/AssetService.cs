using System.Text.Json;

namespace StoneSoup.Server.Services;

public class AssetService
{
    private readonly string _assetRoot;

    public AssetService(string assetRoot)
    {
        _assetRoot = Path.GetFullPath(assetRoot);
        Directory.CreateDirectory(Path.Combine(_assetRoot, "sprites"));
    }

    public record FileNode(string Name, string Type, long? Size, string Path, List<FileNode>? Children);

    public List<FileNode> GetFileTree()
    {
        return ListDirectory(_assetRoot, "");
    }

    private List<FileNode> ListDirectory(string fullPath, string relativePath)
    {
        var nodes = new List<FileNode>();

        foreach (var dir in Directory.GetDirectories(fullPath).OrderBy(d => d))
        {
            var name = System.IO.Path.GetFileName(dir);
            var relPath = string.IsNullOrEmpty(relativePath) ? name : $"{relativePath}/{name}";
            var children = ListDirectory(dir, relPath);
            nodes.Add(new FileNode(name, "directory", null, relPath, children));
        }

        foreach (var file in Directory.GetFiles(fullPath).OrderBy(f => f))
        {
            var name = System.IO.Path.GetFileName(file);
            var relPath = string.IsNullOrEmpty(relativePath) ? name : $"{relativePath}/{name}";
            var info = new FileInfo(file);
            nodes.Add(new FileNode(name, "file", info.Length, relPath, null));
        }

        return nodes;
    }

    public string? ResolvePath(string relativePath)
    {
        if (relativePath.Contains(".."))
            return null;

        var fullPath = Path.GetFullPath(Path.Combine(_assetRoot, relativePath));
        if (!fullPath.StartsWith(_assetRoot))
            return null;

        return fullPath;
    }

    public byte[]? ReadFile(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);
        if (fullPath == null || !File.Exists(fullPath))
            return null;
        return File.ReadAllBytes(fullPath);
    }

    public bool WriteFile(string relativePath, byte[] data)
    {
        var fullPath = ResolvePath(relativePath);
        if (fullPath == null)
            return false;

        var dir = Path.GetDirectoryName(fullPath)!;
        Directory.CreateDirectory(dir);
        File.WriteAllBytes(fullPath, data);
        return true;
    }

    public bool DeleteFile(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);
        if (fullPath == null || !File.Exists(fullPath))
            return false;
        File.Delete(fullPath);
        return true;
    }

    public static string GetContentType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".json" => "application/json",
            ".lua" => "text/plain",
            ".txt" => "text/plain",
            _ => "application/octet-stream",
        };
    }
}
