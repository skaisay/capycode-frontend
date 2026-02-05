'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  FileCode,
  FileJson,
  FileType,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectFile {
  path: string;
  content: string;
  type: string;
}

interface FileTreeProps {
  files: ProjectFile[];
  activeFile?: string;
  onFileSelect: (file: ProjectFile) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: ProjectFile;
}

export function FileTree({ files, activeFile, onFileSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="py-2">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
          depth={0}
        />
      ))}
    </div>
  );
}

function TreeItem({ 
  node, 
  activeFile, 
  onFileSelect, 
  depth 
}: { 
  node: TreeNode; 
  activeFile?: string;
  onFileSelect: (file: ProjectFile) => void;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  const isActive = node.path === activeFile;
  const isFolder = node.type === 'folder';
  const Icon = getFileIcon(node.name, isFolder, isOpen);

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else if (node.file) {
      onFileSelect(node.file);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          'file-tree-item',
          isActive && 'active',
          depth > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder && (
          <span className="text-surface-500">
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        <Icon className={cn(
          'w-4 h-4',
          isFolder ? 'text-yellow-500' : getFileIconColor(node.name)
        )} />
        <span className="text-sm truncate">{node.name}</span>
      </div>
      
      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const pathMap = new Map<string, TreeNode>();

  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!pathMap.has(currentPath)) {
        const isFile = i === parts.length - 1;
        const node: TreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          file: isFile ? file : undefined,
        };

        pathMap.set(currentPath, node);

        if (parentPath) {
          const parent = pathMap.get(parentPath);
          parent?.children?.push(node);
        } else {
          root.push(node);
        }
      }
    }
  }

  // Sort children: folders first, then files
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(node => {
      if (node.children) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(root);

  return root;
}

function getFileIcon(name: string, isFolder: boolean, isOpen: boolean) {
  if (isFolder) {
    return isOpen ? FolderOpen : Folder;
  }

  const ext = name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return Image;
    default:
      return File;
  }
}

function getFileIconColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-blue-400';
    case 'js':
    case 'jsx':
      return 'text-yellow-400';
    case 'json':
      return 'text-green-400';
    case 'css':
    case 'scss':
      return 'text-pink-400';
    case 'md':
      return 'text-surface-400';
    default:
      return 'text-surface-400';
  }
}
