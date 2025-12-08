import React, { useState, useEffect, useRef } from 'react';

interface PythonRunnerProps {
  code: string;
  title?: string;
}

declare global {
  interface Window {
    loadPyodide: () => Promise<any>;
    pyodide: any;
  }
}

let pyodidePromise: Promise<any> | null = null;

async function loadPyodideInstance() {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = new Promise(async (resolve, reject) => {
    try {
      // Load Pyodide script if not already loaded
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise<void>((res, rej) => {
          script.onload = () => res();
          script.onerror = () => rej(new Error('Failed to load Pyodide'));
        });
      }

      const pyodide = await window.loadPyodide();
      window.pyodide = pyodide;
      resolve(pyodide);
    } catch (error) {
      pyodidePromise = null;
      reject(error);
    }
  });

  return pyodidePromise;
}

export default function PythonRunner({ code, title = 'Python' }: PythonRunnerProps): JSX.Element {
  const [editableCode, setEditableCode] = useState(code);
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Pre-load Pyodide in the background
    loadPyodideInstance()
      .then(() => setPyodideReady(true))
      .catch(() => setPyodideReady(false));
  }, []);

  const runCode = async () => {
    setIsLoading(true);
    setIsError(false);
    setOutput('');

    try {
      const pyodide = await loadPyodideInstance();

      // Redirect stdout/stderr
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

      // Run user code
      try {
        await pyodide.runPythonAsync(editableCode);
      } catch (e: any) {
        // Get stderr output
        const stderr = pyodide.runPython('sys.stderr.getvalue()');
        if (stderr) {
          setOutput(stderr);
          setIsError(true);
          setIsLoading(false);
          return;
        }
        throw e;
      }

      // Get stdout output
      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      setOutput(stdout || '(No output)');
    } catch (error: any) {
      setOutput(error.message || 'An error occurred');
      setIsError(true);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newCode = editableCode.substring(0, start) + '    ' + editableCode.substring(end);
        setEditableCode(newCode);
        // Set cursor position after tab
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
    }
  };

  return (
    <div className="python-runner">
      <div className="python-runner-header">
        <span>{title}</span>
        <button
          className="python-runner-btn"
          onClick={runCode}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Run Code'}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="python-runner-editor"
        value={editableCode}
        onChange={(e) => setEditableCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
      {!pyodideReady && !isLoading && (
        <div className="python-runner-loading">
          Loading Python runtime...
        </div>
      )}
      {(output || isLoading) && (
        <div className={`python-runner-output ${isError ? 'error' : ''}`}>
          {isLoading ? 'Executing...' : output}
        </div>
      )}
    </div>
  );
}
