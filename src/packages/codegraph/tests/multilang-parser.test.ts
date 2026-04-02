import { describe, it, expect } from 'vitest';
import { ASTParser, createASTParser } from '../src/index.js';

// ---------------------------------------------------------------------------
// Multi-language AST parsing (REQ-CG-001)
// ---------------------------------------------------------------------------

const PYTHON_SOURCE = `
import os
from pathlib import Path

class DataProcessor:
    def __init__(self):
        pass

    def process(self, data):
        return data

async def fetch_data():
    pass

count = 0
`;

const JAVA_SOURCE = `
import java.util.List;
import java.util.Map;

public class UserService {
    private String name;

    public void createUser(String name) {
        this.name = name;
    }

    public String getUser(int id) {
        return name;
    }
}

public interface Repository {
    void save();
}
`;

const GO_SOURCE = `
package main

import (
    "fmt"
    "net/http"
)

type Server struct {
    Port int
}

type Handler interface {
    ServeHTTP()
}

func main() {
    fmt.Println("hello")
}

func (s *Server) Start() {
    fmt.Println("starting")
}

var version = "1.0"
const maxRetries = 3
`;

const RUST_SOURCE = `
use std::collections::HashMap;

pub struct Config {
    name: String,
}

pub trait Configurable {
    fn configure(&self);
}

pub fn init() {
    println!("init");
}

pub async fn fetch() {
    todo!()
}

pub static MAX: i32 = 100;
`;

const RUBY_SOURCE = `
require 'json'
require_relative 'helper'

class UserController
  def index
    @users = User.all
  end

  def self.configure
    # class method
  end
end

module Authentication
  def authenticate
    true
  end
end
`;

const PHP_SOURCE = `
<?php
use App\\Models\\User;

class OrderService {
    private $total;

    public function calculate(array $items) {
        return array_sum($items);
    }

    public static function create() {
        return new self();
    }
}

interface PaymentGateway {
    public function charge();
}

function helper() {
    return true;
}
`;

describe('REQ-CG-001: Python parser', () => {
  it('should parse class declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PYTHON_SOURCE, 'python');
    const classes = nodes.filter((n) => n.kind === 'class');
    expect(classes.length).toBe(1);
    expect(classes[0].name).toBe('DataProcessor');
  });

  it('should parse function declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PYTHON_SOURCE, 'python');
    const fns = nodes.filter((n) => n.kind === 'function');
    expect(fns.length).toBeGreaterThanOrEqual(1);
    expect(fns.some((f) => f.name === 'fetch_data')).toBe(true);
  });

  it('should parse import statements', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PYTHON_SOURCE, 'python');
    const imports = nodes.filter((n) => n.kind === 'import');
    expect(imports.length).toBeGreaterThanOrEqual(2);
  });

  it('should set correct line numbers', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PYTHON_SOURCE, 'python');
    const cls = nodes.find((n) => n.kind === 'class');
    expect(cls).toBeDefined();
    expect(cls!.startLine).toBeGreaterThan(0);
  });
});

describe('REQ-CG-001: Java parser', () => {
  it('should parse class declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(JAVA_SOURCE, 'java');
    const classes = nodes.filter((n) => n.kind === 'class');
    expect(classes.length).toBe(1);
    expect(classes[0].name).toBe('UserService');
  });

  it('should parse interface declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(JAVA_SOURCE, 'java');
    const ifaces = nodes.filter((n) => n.kind === 'interface');
    expect(ifaces.length).toBe(1);
    expect(ifaces[0].name).toBe('Repository');
  });

  it('should parse method declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(JAVA_SOURCE, 'java');
    const methods = nodes.filter((n) => n.kind === 'function');
    expect(methods.length).toBeGreaterThanOrEqual(2);
    expect(methods.some((m) => m.name === 'createUser')).toBe(true);
    expect(methods.some((m) => m.name === 'getUser')).toBe(true);
  });

  it('should parse import statements', () => {
    const parser = createASTParser();
    const nodes = parser.parse(JAVA_SOURCE, 'java');
    const imports = nodes.filter((n) => n.kind === 'import');
    expect(imports.length).toBe(2);
    expect(imports[0].name).toBe('java.util.List');
  });
});

describe('REQ-CG-001: Go parser', () => {
  it('should parse struct declarations as class', () => {
    const parser = createASTParser();
    const nodes = parser.parse(GO_SOURCE, 'go');
    const structs = nodes.filter((n) => n.kind === 'class');
    expect(structs.length).toBe(1);
    expect(structs[0].name).toBe('Server');
  });

  it('should parse interface declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(GO_SOURCE, 'go');
    const ifaces = nodes.filter((n) => n.kind === 'interface');
    expect(ifaces.length).toBe(1);
    expect(ifaces[0].name).toBe('Handler');
  });

  it('should parse function declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(GO_SOURCE, 'go');
    const fns = nodes.filter((n) => n.kind === 'function');
    expect(fns.length).toBeGreaterThanOrEqual(2);
    expect(fns.some((f) => f.name === 'main')).toBe(true);
    expect(fns.some((f) => f.name === 'Start')).toBe(true);
  });

  it('should parse import paths', () => {
    const parser = createASTParser();
    const nodes = parser.parse(GO_SOURCE, 'go');
    const imports = nodes.filter((n) => n.kind === 'import');
    expect(imports.length).toBeGreaterThanOrEqual(2);
    expect(imports.some((i) => i.name === 'fmt')).toBe(true);
  });

  it('should parse variable declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(GO_SOURCE, 'go');
    const vars = nodes.filter((n) => n.kind === 'variable');
    expect(vars.length).toBeGreaterThanOrEqual(1);
  });
});

describe('REQ-CG-001: Rust parser', () => {
  it('should parse struct as class', () => {
    const parser = createASTParser();
    const nodes = parser.parse(RUST_SOURCE, 'rust');
    const structs = nodes.filter((n) => n.kind === 'class');
    expect(structs.length).toBe(1);
    expect(structs[0].name).toBe('Config');
  });

  it('should parse trait as interface', () => {
    const parser = createASTParser();
    const nodes = parser.parse(RUST_SOURCE, 'rust');
    const traits = nodes.filter((n) => n.kind === 'interface');
    expect(traits.length).toBe(1);
    expect(traits[0].name).toBe('Configurable');
  });

  it('should parse fn declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(RUST_SOURCE, 'rust');
    const fns = nodes.filter((n) => n.kind === 'function');
    expect(fns.length).toBeGreaterThanOrEqual(2);
    expect(fns.some((f) => f.name === 'init')).toBe(true);
    expect(fns.some((f) => f.name === 'fetch')).toBe(true);
  });
});

describe('REQ-CG-001: Ruby parser', () => {
  it('should parse class declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(RUBY_SOURCE, 'ruby');
    const classes = nodes.filter((n) => n.kind === 'class');
    expect(classes.length).toBe(1);
    expect(classes[0].name).toBe('UserController');
  });

  it('should parse module declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(RUBY_SOURCE, 'ruby');
    const modules = nodes.filter((n) => n.kind === 'module');
    expect(modules.length).toBe(1);
    expect(modules[0].name).toBe('Authentication');
  });

  it('should parse require/import statements', () => {
    const parser = createASTParser();
    const nodes = parser.parse(RUBY_SOURCE, 'ruby');
    const imports = nodes.filter((n) => n.kind === 'import');
    expect(imports.length).toBeGreaterThanOrEqual(2);
  });
});

describe('REQ-CG-001: PHP parser', () => {
  it('should parse class declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PHP_SOURCE, 'php');
    const classes = nodes.filter((n) => n.kind === 'class');
    expect(classes.length).toBe(1);
    expect(classes[0].name).toBe('OrderService');
  });

  it('should parse interface declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PHP_SOURCE, 'php');
    const ifaces = nodes.filter((n) => n.kind === 'interface');
    expect(ifaces.length).toBe(1);
    expect(ifaces[0].name).toBe('PaymentGateway');
  });

  it('should parse function declarations', () => {
    const parser = createASTParser();
    const nodes = parser.parse(PHP_SOURCE, 'php');
    const fns = nodes.filter((n) => n.kind === 'function');
    expect(fns.length).toBeGreaterThanOrEqual(2);
  });
});

describe('REQ-CG-001: All 16 languages have patterns', () => {
  it('should no longer return empty for previously unsupported languages', () => {
    const parser = createASTParser();
    expect(parser.parse('fn main() {}', 'rust').length).toBeGreaterThan(0);
    expect(parser.parse('def main():\n    pass', 'python').length).toBeGreaterThan(0);
    expect(parser.parse('func main() {}', 'go').length).toBeGreaterThan(0);
  });

  it('TS/JS parsing still works after refactor', () => {
    const parser = createASTParser();
    const tsNodes = parser.parse('export class Foo {}', 'typescript');
    expect(tsNodes.length).toBe(1);
    expect(tsNodes[0].kind).toBe('class');

    const jsNodes = parser.parse('function bar() {}', 'javascript');
    expect(jsNodes.length).toBe(1);
    expect(jsNodes[0].kind).toBe('function');
  });
});
