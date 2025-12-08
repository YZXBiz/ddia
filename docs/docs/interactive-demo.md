---
sidebar_position: 99
title: "Interactive Code"
description: "Run code directly in your browser"
---

import PythonRunner from '@site/src/components/PythonRunner';
import CodeRunner from '@site/src/components/CodeRunner';

# Interactive Code Demo

Run code directly in your browser - no installation required!

---

## Python

<PythonRunner
  code={`# Python runs via Pyodide (WebAssembly)
print("Hello from Python!")

# Lists and loops
numbers = [1, 2, 3, 4, 5]
squared = [n ** 2 for n in numbers]
print(f"Squared: {squared}")

# Dictionary
data = {"name": "Alice", "score": 95}
for key, value in data.items():
    print(f"  {key}: {value}")`}
  title="Python Example"
/>

---

## C++

<CodeRunner
  language="cpp"
  title="C++ Example"
  code={`#include <iostream>
#include <vector>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;

    vector<int> nums = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int n : nums) {
        sum += n;
    }
    cout << "Sum: " << sum << endl;

    return 0;
}`}
/>

---

## Go

<CodeRunner
  language="go"
  title="Go Example"
  code={`package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")

    // Slice operations
    nums := []int{1, 2, 3, 4, 5}
    sum := 0
    for _, n := range nums {
        sum += n
    }
    fmt.Printf("Sum: %d\\n", sum)
}`}
/>

---

## Rust

<CodeRunner
  language="rust"
  title="Rust Example"
  code={`fn main() {
    println!("Hello from Rust!");

    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);

    // Pattern matching
    let x = 42;
    match x {
        0 => println!("Zero"),
        1..=50 => println!("Small number"),
        _ => println!("Large number"),
    }
}`}
/>

---

## Java

<CodeRunner
  language="java"
  title="Java Example"
  code={`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");

        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : nums) {
            sum += n;
        }
        System.out.println("Sum: " + sum);
    }
}`}
/>

---

## JavaScript

```jsx live
function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Count: {count}</h3>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
    </div>
  );
}
```

---

## Supported Languages

| Language | Status | Notes |
|----------|--------|-------|
| Python | Local (Pyodide) | Runs in browser via WebAssembly |
| JavaScript | Local | Live React components |
| C++ | Remote (Judge0 CE) | Free public API |
| Go | Remote (Judge0 CE) | Free public API |
| Rust | Remote (Judge0 CE) | Free public API |
| Java | Remote (Judge0 CE) | Free public API |
| C# | Remote (Judge0 CE) | Free public API |
| Ruby | Remote (Judge0 CE) | Free public API |
| PHP | Remote (Judge0 CE) | Free public API |

---

## How It Works

| Language | Execution | Notes |
|----------|-----------|-------|
| Python | Local (Pyodide) | Runs in browser via WebAssembly - fast! |
| JavaScript | Local | Live React components |
| All others | Remote (Judge0 CE) | Free public API, no key needed |

All languages work out of the box with no configuration needed!
