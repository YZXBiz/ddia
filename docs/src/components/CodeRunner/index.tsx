import React, { useState, useCallback } from 'react';
import styles from './styles.module.css';

// Language configurations with Judge0 language IDs
const LANGUAGES = {
  python: { id: 71, name: 'Python', ext: 'py' },
  cpp: { id: 54, name: 'C++', ext: 'cpp' },
  c: { id: 50, name: 'C', ext: 'c' },
  java: { id: 62, name: 'Java', ext: 'java' },
  javascript: { id: 63, name: 'JavaScript', ext: 'js' },
  typescript: { id: 74, name: 'TypeScript', ext: 'ts' },
  go: { id: 60, name: 'Go', ext: 'go' },
  rust: { id: 73, name: 'Rust', ext: 'rs' },
  ruby: { id: 72, name: 'Ruby', ext: 'rb' },
  php: { id: 68, name: 'PHP', ext: 'php' },
  csharp: { id: 51, name: 'C#', ext: 'cs' },
  kotlin: { id: 78, name: 'Kotlin', ext: 'kt' },
  swift: { id: 83, name: 'Swift', ext: 'swift' },
  bash: { id: 46, name: 'Bash', ext: 'sh' },
  sql: { id: 82, name: 'SQL', ext: 'sql' },
};

type LanguageKey = keyof typeof LANGUAGES;

interface CodeRunnerProps {
  code: string;
  language: LanguageKey;
  title?: string;
  stdin?: string;
}

// Free public Judge0 CE instance - no API key required!
const JUDGE0_API = 'https://ce.judge0.com';

export default function CodeRunner({
  code,
  language,
  title,
  stdin = ''
}: CodeRunnerProps): JSX.Element {
  const [editableCode, setEditableCode] = useState(code);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>('');

  const langConfig = LANGUAGES[language];

  // Local Python execution using Pyodide (faster, no network)
  const runPythonLocally = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      // @ts-ignore
      if (!window.pyodide) {
        setOutput('Loading Python runtime...');
        // @ts-ignore
        window.pyodide = await window.loadPyodide();
      }

      // @ts-ignore
      const pyodide = window.pyodide;

      // Capture stdout
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `);

      // Run user code
      await pyodide.runPythonAsync(editableCode);

      // Get output
      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      setOutput(stdout || '(No output)');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  }, [editableCode]);

  // Remote execution via Judge0 (for all languages)
  const runCodeRemote = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      // Submit code
      const submitResponse = await fetch(`${JUDGE0_API}/submissions?base64_encoded=true&wait=false`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_code: btoa(unescape(encodeURIComponent(editableCode))),
          language_id: langConfig.id,
          stdin: stdin ? btoa(unescape(encodeURIComponent(stdin))) : '',
        }),
      });

      if (!submitResponse.ok) {
        throw new Error(`Server error: ${submitResponse.status}`);
      }

      const { token } = await submitResponse.json();

      // Poll for result
      let result;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await fetch(`${JUDGE0_API}/submissions/${token}?base64_encoded=true`);
        result = await statusResponse.json();

        // Status 1 = In Queue, 2 = Processing
        if (result.status?.id > 2) break;
        attempts++;
      }

      if (!result) {
        throw new Error('Timeout waiting for result');
      }

      // Decode result
      const decode = (str: string) => {
        try {
          return str ? decodeURIComponent(escape(atob(str))) : '';
        } catch {
          return str || '';
        }
      };

      if (result.stdout) {
        setOutput(decode(result.stdout));
      } else if (result.stderr) {
        setError(decode(result.stderr));
      } else if (result.compile_output) {
        setError(decode(result.compile_output));
      } else if (result.status?.description) {
        if (result.status.id === 3) {
          setOutput('(No output)');
        } else {
          setError(result.status.description);
        }
      }
    } catch (err: any) {
      setError(`Execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [editableCode, langConfig, stdin]);

  const runCode = useCallback(() => {
    // Use local Pyodide for Python (faster)
    if (language === 'python') {
      runPythonLocally();
    } else {
      runCodeRemote();
    }
  }, [language, runPythonLocally, runCodeRemote]);

  return (
    <div className={styles.container}>
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.header}>
        <span className={styles.language}>{langConfig.name}</span>
        <button
          className={styles.runButton}
          onClick={runCode}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>
      <textarea
        className={styles.editor}
        value={editableCode}
        onChange={(e) => setEditableCode(e.target.value)}
        spellCheck={false}
      />
      {(output || error) && (
        <div className={styles.outputContainer}>
          <div className={styles.outputLabel}>Output:</div>
          <pre className={`${styles.output} ${error ? styles.error : ''}`}>
            {error || output}
          </pre>
        </div>
      )}
    </div>
  );
}

// Load Pyodide script dynamically
declare global {
  interface Window {
    pyodide: any;
    loadPyodide: () => Promise<any>;
  }
}

if (typeof window !== 'undefined' && !document.getElementById('pyodide-script')) {
  const script = document.createElement('script');
  script.id = 'pyodide-script';
  script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
  document.head.appendChild(script);
}
