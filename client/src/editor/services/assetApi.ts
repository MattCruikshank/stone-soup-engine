export interface FileNode {
    name: string;
    type: 'file' | 'directory';
    size?: number;
    path: string;
    children?: FileNode[];
}

export async function fetchFileTree(): Promise<FileNode[]> {
    const res = await fetch('/api/assets');
    if (!res.ok) throw new Error(`Failed to fetch file tree: ${res.status}`);
    return res.json();
}

export async function loadAsset(path: string): Promise<Blob> {
    const res = await fetch(`/api/assets/${path}`);
    if (!res.ok) throw new Error(`Failed to load asset: ${res.status}`);
    return res.blob();
}

export async function saveAsset(path: string, data: Blob): Promise<void> {
    const res = await fetch(`/api/assets/${path}`, { method: 'PUT', body: data });
    if (!res.ok) throw new Error(`Failed to save asset: ${res.status}`);
}

export async function deleteAsset(path: string): Promise<void> {
    const res = await fetch(`/api/assets/${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete asset: ${res.status}`);
}
