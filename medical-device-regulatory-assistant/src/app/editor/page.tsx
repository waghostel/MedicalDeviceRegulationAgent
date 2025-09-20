import { DocumentEditor } from '@/components/editor/document-editor';

export default function EditorPage() {
  // In a real app, this would come from route params or context
  const projectId = 'project-1';

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Document Editor</h1>
            <p className="text-sm text-gray-600">
              Create and edit regulatory documents with AI assistance
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <DocumentEditor projectId={projectId} />
      </main>
    </div>
  );
}
