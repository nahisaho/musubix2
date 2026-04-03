import { describe, it, expect } from 'vitest';
import { createASTParser } from '../src/index.js';
import type { ASTParserOptions } from '../src/index.js';
import {
  PythonParser,
  JavaParser,
  GoParser,
  RustParser,
  RubyParser,
  PhpParser,
  MultiLanguageParser,
  createMultiLanguageParser,
  BraceBlockTracker,
  IndentBlockTracker,
} from '../src/multi-lang-parser.js';
import type { ParseResult, ASTNode } from '../src/multi-lang-parser.js';

// ---------------------------------------------------------------------------
// Multi-language AST parsing — original backward-compat tests (REQ-CG-001)
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

describe('REQ-CG-001: Python parser (regex)', () => {
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

describe('REQ-CG-001: Java parser (regex)', () => {
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

describe('REQ-CG-001: Go parser (regex)', () => {
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

describe('REQ-CG-001: Rust parser (regex)', () => {
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

describe('REQ-CG-001: Ruby parser (regex)', () => {
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

describe('REQ-CG-001: PHP parser (regex)', () => {
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

// ===========================================================================
// Enhanced multi-language parser tests
// ===========================================================================

describe('Enhanced PythonParser', () => {
  const parser = new PythonParser();

  it('should detect class with methods as children', () => {
    const result = parser.parse(`
class MyClass:
    def __init__(self, name: str):
        self.name = name

    async def process(self) -> bool:
        pass
`);
    expect(result.nodes.length).toBe(1);
    const cls = result.nodes[0];
    expect(cls.type).toBe('class');
    expect(cls.name).toBe('MyClass');
    expect(cls.children.length).toBe(2);
    expect(cls.children[0].name).toBe('__init__');
    expect(cls.children[0].type).toBe('method');
    expect(cls.children[0].modifiers).toContain('constructor');
    expect(cls.children[1].name).toBe('process');
    expect(cls.children[1].modifiers).toContain('async');
  });

  it('should detect nested classes', () => {
    const result = parser.parse(`
class Outer:
    class Inner:
        def method(self):
            pass
    def outer_method(self):
        pass
`);
    const outer = result.nodes[0];
    expect(outer.name).toBe('Outer');
    expect(outer.children.length).toBe(2);
    const inner = outer.children.find((c) => c.type === 'class');
    expect(inner).toBeDefined();
    expect(inner!.name).toBe('Inner');
    expect(inner!.children.length).toBe(1);
    expect(inner!.children[0].name).toBe('method');
  });

  it('should detect decorators', () => {
    const result = parser.parse(`
@decorator
def standalone_func(x: int, y: int) -> int:
    return x + y
`);
    const fn = result.nodes[0];
    expect(fn.type).toBe('function');
    expect(fn.name).toBe('standalone_func');
    expect(fn.modifiers).toContain('@decorator');
    expect(fn.returnType).toBe('int');
  });

  it('should parse import and from...import', () => {
    const result = parser.parse(`
import os
import sys
from pathlib import Path
from collections import OrderedDict, defaultdict
from typing import *
`);
    expect(result.imports.length).toBe(5);
    expect(result.imports[0].module).toBe('os');
    expect(result.imports[2].module).toBe('pathlib');
    expect(result.imports[2].symbols).toContain('Path');
    expect(result.imports[3].symbols).toContain('OrderedDict');
    expect(result.imports[3].symbols).toContain('defaultdict');
    expect(result.imports[4].isWildcard).toBe(true);
  });

  it('should detect async functions', () => {
    const result = parser.parse(`
async def fetch_data(url: str) -> bytes:
    pass
`);
    const fn = result.nodes[0];
    expect(fn.type).toBe('function');
    expect(fn.modifiers).toContain('async');
    expect(fn.returnType).toBe('bytes');
  });

  it('should detect type hints in params', () => {
    const result = parser.parse(`
def process(data: list, count: int) -> dict:
    pass
`);
    const fn = result.nodes[0];
    expect(fn.params).toBeDefined();
    expect(fn.params!.length).toBe(2);
    expect(fn.params![0]).toBe('data: list');
    expect(fn.returnType).toBe('dict');
  });

  it('should track parent references', () => {
    const result = parser.parse(`
class Service:
    def handle(self):
        pass
`);
    const cls = result.nodes[0];
    const method = cls.children[0];
    expect(method.parent).toBe('Service');
  });

  it('should compute endLine for classes and methods', () => {
    const result = parser.parse(`class Foo:
    def bar(self):
        pass
    def baz(self):
        pass
`);
    const cls = result.nodes[0];
    expect(cls.startLine).toBe(1);
    expect(cls.endLine).toBe(6);
    expect(cls.children.length).toBe(2);
  });
});

describe('Enhanced JavaParser', () => {
  const parser = new JavaParser();

  it('should detect class with modifiers and methods as children', () => {
    const result = parser.parse(`
public class UserService implements Service {
    private String name;

    public void process(Request req) throws Exception {
        // ...
    }

    @Override
    public String toString() { return name; }
}
`);
    expect(result.nodes.length).toBe(1);
    const cls = result.nodes[0];
    expect(cls.type).toBe('class');
    expect(cls.name).toBe('UserService');
    expect(cls.modifiers).toContain('public');
    expect(cls.children.length).toBeGreaterThanOrEqual(2);
    const process = cls.children.find((c) => c.name === 'process');
    expect(process).toBeDefined();
    expect(process!.type).toBe('method');
    const toString = cls.children.find((c) => c.name === 'toString');
    expect(toString).toBeDefined();
    expect(toString!.modifiers).toContain('@Override');
  });

  it('should detect interface', () => {
    const result = parser.parse(`
public interface Repository {
    void save();
    List<User> findAll();
}
`);
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('interface');
    expect(result.nodes[0].name).toBe('Repository');
  });

  it('should detect annotations', () => {
    const result = parser.parse(`
@Entity
@Table(name = "users")
public class User {
    @Override
    public String toString() { return ""; }
}
`);
    const cls = result.nodes[0];
    expect(cls.modifiers).toContain('@Entity');
    expect(cls.modifiers).toContain('@Table');
    const toStr = cls.children.find((c) => c.name === 'toString');
    expect(toStr).toBeDefined();
    expect(toStr!.modifiers).toContain('@Override');
  });

  it('should detect enum declarations', () => {
    const result = parser.parse(`
public enum Color {
    RED, GREEN, BLUE
}
`);
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('enum');
    expect(result.nodes[0].name).toBe('Color');
  });

  it('should parse import statements', () => {
    const result = parser.parse(`
import java.util.List;
import java.util.*;
import static java.lang.Math.PI;
`);
    expect(result.imports.length).toBe(3);
    expect(result.imports[0].module).toBe('java.util.List');
    expect(result.imports[1].isWildcard).toBe(true);
  });

  it('should detect method return types', () => {
    const result = parser.parse(`
public class Svc {
    public String getName() { return ""; }
}
`);
    const method = result.nodes[0].children[0];
    expect(method.returnType).toBe('String');
  });
});

describe('Enhanced GoParser', () => {
  const parser = new GoParser();

  it('should detect struct and interface', () => {
    const result = parser.parse(`
type UserService struct {
    db *Database
}

type Handler interface {
    Handle(req Request) Response
}
`);
    const structs = result.nodes.filter((n) => n.type === 'struct');
    const ifaces = result.nodes.filter((n) => n.type === 'interface');
    expect(structs.length).toBe(1);
    expect(structs[0].name).toBe('UserService');
    expect(ifaces.length).toBe(1);
    expect(ifaces[0].name).toBe('Handler');
  });

  it('should detect methods with receivers as children of struct', () => {
    const result = parser.parse(`
type UserService struct {
    db *Database
}

func (s *UserService) GetUser(id string) (*User, error) {
    return nil, nil
}
`);
    const svc = result.nodes.find((n) => n.name === 'UserService');
    expect(svc).toBeDefined();
    expect(svc!.children.length).toBe(1);
    expect(svc!.children[0].name).toBe('GetUser');
    expect(svc!.children[0].type).toBe('method');
    expect(svc!.children[0].modifiers).toContain('exported');
  });

  it('should detect package-level functions', () => {
    const result = parser.parse(`
func NewUserService(db *Database) *UserService {
    return &UserService{db: db}
}
`);
    const fn = result.nodes.find((n) => n.type === 'function');
    expect(fn).toBeDefined();
    expect(fn!.name).toBe('NewUserService');
    expect(fn!.modifiers).toContain('exported');
  });

  it('should parse grouped imports', () => {
    const result = parser.parse(`
import (
    "fmt"
    "net/http"
    "os"
)
`);
    expect(result.imports.length).toBe(3);
    expect(result.imports[0].module).toBe('fmt');
    expect(result.imports[1].module).toBe('net/http');
  });

  it('should detect exported (capitalized) names', () => {
    const result = parser.parse(`
func PublicFunc() {}
func privateFunc() {}
`);
    const pub = result.nodes.find((n) => n.name === 'PublicFunc');
    const priv = result.nodes.find((n) => n.name === 'privateFunc');
    expect(pub!.modifiers).toContain('exported');
    expect(priv!.modifiers).not.toContain('exported');
  });

  it('should detect var and const declarations', () => {
    const result = parser.parse(`
var version = "1.0"
const maxRetries = 3
`);
    const props = result.nodes.filter((n) => n.type === 'property');
    expect(props.length).toBe(2);
    expect(props[0].name).toBe('version');
    expect(props[1].name).toBe('maxRetries');
  });
});

describe('Enhanced RustParser', () => {
  const parser = new RustParser();

  it('should detect struct, enum, and trait', () => {
    const result = parser.parse(`
pub struct Config {
    name: String,
}

pub enum Status {
    Active,
    Inactive,
}

trait Validator {
    fn validate(&self) -> Result<(), Error>;
}
`);
    const structs = result.nodes.filter((n) => n.type === 'struct');
    const enums = result.nodes.filter((n) => n.type === 'enum');
    const traits = result.nodes.filter((n) => n.type === 'trait');
    expect(structs.length).toBe(1);
    expect(structs[0].name).toBe('Config');
    expect(structs[0].modifiers).toContain('pub');
    expect(enums.length).toBe(1);
    expect(enums[0].name).toBe('Status');
    expect(traits.length).toBe(1);
    expect(traits[0].name).toBe('Validator');
  });

  it('should detect impl blocks with methods', () => {
    const result = parser.parse(`
impl Config {
    pub fn new(name: &str) -> Self {
        Config { name: name.to_string() }
    }

    fn private_method(&self) {
    }
}
`);
    const impl = result.nodes.find((n) => n.name === 'Config' && n.type === 'class');
    expect(impl).toBeDefined();
    expect(impl!.children.length).toBe(2);
    expect(impl!.children[0].name).toBe('new');
    expect(impl!.children[0].type).toBe('method');
    expect(impl!.children[0].modifiers).toContain('pub');
    expect(impl!.children[0].returnType).toBe('Self');
  });

  it('should detect impl Trait for Type', () => {
    const result = parser.parse(`
impl Display for Config {
    fn fmt(&self, f: &mut Formatter) -> Result {
    }
}
`);
    const impl = result.nodes.find(
      (n) => n.name === 'Display for Config',
    );
    expect(impl).toBeDefined();
    expect(impl!.modifiers).toContain('impl_trait');
  });

  it('should detect pub/async modifiers on functions', () => {
    const result = parser.parse(`
pub async fn fetch_data(url: &str) -> Vec<u8> {
    vec![]
}
`);
    const fn_ = result.nodes[0];
    expect(fn_.modifiers).toContain('pub');
    expect(fn_.modifiers).toContain('async');
    expect(fn_.returnType).toBe('Vec<u8>');
  });

  it('should parse use imports', () => {
    const result = parser.parse(`
use std::collections::HashMap;
use std::io::{Read, Write};
use crate::config::*;
`);
    expect(result.imports.length).toBe(3);
    expect(result.imports[0].module).toBe('std::collections');
    expect(result.imports[0].symbols).toContain('HashMap');
    expect(result.imports[1].symbols).toContain('Read');
    expect(result.imports[1].symbols).toContain('Write');
    expect(result.imports[2].isWildcard).toBe(true);
  });

  it('should detect attributes', () => {
    const result = parser.parse(`
#[derive(Debug)]
pub struct Point {
    x: f64,
    y: f64,
}
`);
    const s = result.nodes[0];
    expect(s.modifiers).toContain('#[derive(Debug)]');
  });
});

describe('Enhanced RubyParser', () => {
  const parser = new RubyParser();

  it('should detect class with methods and end-tracking', () => {
    const result = parser.parse(`
class UserController
  def index
    @users = User.all
  end

  def self.configure
  end
end
`);
    expect(result.nodes.length).toBe(1);
    const cls = result.nodes[0];
    expect(cls.type).toBe('class');
    expect(cls.name).toBe('UserController');
    expect(cls.children.length).toBe(2);
    expect(cls.children[0].name).toBe('index');
    expect(cls.children[0].type).toBe('method');
    expect(cls.children[1].name).toBe('configure');
    expect(cls.children[1].modifiers).toContain('static');
  });

  it('should detect module with methods', () => {
    const result = parser.parse(`
module Authentication
  def authenticate
    true
  end
end
`);
    const mod = result.nodes[0];
    expect(mod.type).toBe('module');
    expect(mod.name).toBe('Authentication');
    expect(mod.children.length).toBe(1);
    expect(mod.children[0].name).toBe('authenticate');
  });

  it('should parse require and require_relative', () => {
    const result = parser.parse(`
require 'json'
require_relative 'helper'
`);
    expect(result.imports.length).toBe(2);
    expect(result.imports[0].module).toBe('json');
    expect(result.imports[1].module).toBe('helper');
  });

  it('should detect attr_accessor as properties', () => {
    const result = parser.parse(`
class Person
  attr_accessor :name, :age
  attr_reader :id
end
`);
    const cls = result.nodes[0];
    const props = cls.children.filter((c) => c.type === 'property');
    expect(props.length).toBe(3);
    expect(props.map((p) => p.name)).toContain('name');
    expect(props.map((p) => p.name)).toContain('age');
    expect(props.map((p) => p.name)).toContain('id');
  });
});

describe('Enhanced PhpParser', () => {
  const parser = new PhpParser();

  it('should detect class with methods', () => {
    const result = parser.parse(`
<?php
class OrderService {
    private $total;

    public function calculate(array $items) {
        return array_sum($items);
    }

    public static function create() {
        return new self();
    }
}
`);
    expect(result.nodes.length).toBe(1);
    const cls = result.nodes[0];
    expect(cls.type).toBe('class');
    expect(cls.name).toBe('OrderService');
    // Methods are children
    const methods = cls.children.filter((c) => c.type === 'method');
    expect(methods.length).toBe(2);
    expect(methods[0].name).toBe('calculate');
    expect(methods[1].name).toBe('create');
    expect(methods[1].modifiers).toContain('static');
  });

  it('should detect interface and trait', () => {
    const result = parser.parse(`
<?php
interface PaymentGateway {
    public function charge();
}

trait Loggable {
    public function log(string $msg) {
    }
}
`);
    const iface = result.nodes.find((n) => n.type === 'interface');
    const trait = result.nodes.find((n) => n.type === 'trait');
    expect(iface).toBeDefined();
    expect(iface!.name).toBe('PaymentGateway');
    expect(trait).toBeDefined();
    expect(trait!.name).toBe('Loggable');
  });

  it('should parse namespace and use imports', () => {
    const result = parser.parse(`
<?php
namespace App\\Services;

use App\\Models\\User;
use App\\Contracts\\Repository;
`);
    const ns = result.nodes.find((n) => n.type === 'module');
    expect(ns).toBeDefined();
    expect(ns!.name).toBe('App\\Services');
    expect(result.imports.length).toBe(2);
    expect(result.imports[0].module).toBe('App\\Models\\User');
  });

  it('should detect visibility modifiers on methods', () => {
    const result = parser.parse(`
<?php
class Foo {
    public function pubMethod() {}
    private function privMethod() {}
    protected function protMethod() {}
}
`);
    const cls = result.nodes[0];
    const methods = cls.children.filter((c) => c.type === 'method');
    expect(methods.length).toBe(3);
    expect(methods[0].modifiers).toContain('public');
    expect(methods[1].modifiers).toContain('private');
    expect(methods[2].modifiers).toContain('protected');
  });
});

// ===========================================================================
// Integration tests
// ===========================================================================

describe('MultiLanguageParser integration', () => {
  it('should route to correct parser by language', () => {
    const mlp = createMultiLanguageParser();
    const pyResult = mlp.parse('class Foo:\n    pass', 'python');
    expect(pyResult.language).toBe('python');
    expect(pyResult.nodes[0].type).toBe('class');

    const javaResult = mlp.parse('public class Bar {}', 'java');
    expect(javaResult.language).toBe('java');
    expect(javaResult.nodes[0].type).toBe('class');
  });

  it('should fallback for unknown languages', () => {
    const mlp = createMultiLanguageParser();
    const result = mlp.parse('class Foo {}', 'kotlin');
    expect(result.language).toBe('kotlin');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.nodes[0].name).toBe('Foo');
  });

  it('should list supported languages', () => {
    const mlp = createMultiLanguageParser();
    const langs = mlp.getSupportedLanguages();
    expect(langs).toContain('python');
    expect(langs).toContain('java');
    expect(langs).toContain('go');
    expect(langs).toContain('rust');
    expect(langs).toContain('ruby');
    expect(langs).toContain('php');
    expect(langs.length).toBe(6);
  });

  it('should allow registering custom parsers', () => {
    const mlp = createMultiLanguageParser();
    mlp.register({
      language: 'custom',
      extensions: ['.cst'],
      parse: (source: string): ParseResult => ({
        language: 'custom',
        nodes: [
          {
            type: 'function',
            name: 'custom_fn',
            startLine: 1,
            endLine: 1,
            children: [],
            modifiers: [],
            language: 'custom',
          },
        ],
        imports: [],
        exports: [],
        errors: [],
      }),
    });
    const result = mlp.parse('anything', 'custom');
    expect(result.nodes[0].name).toBe('custom_fn');
  });

  it('should return a parser for a known language', () => {
    const mlp = createMultiLanguageParser();
    const pyParser = mlp.getParserFor('python');
    expect(pyParser).toBeDefined();
    expect(pyParser!.language).toBe('python');
  });

  it('should return undefined for unknown parser', () => {
    const mlp = createMultiLanguageParser();
    expect(mlp.getParserFor('brainfuck')).toBeUndefined();
  });
});

describe('ASTParser with enhancedParsing=true', () => {
  it('should use MultiLanguageParser for non-TS/JS languages', () => {
    const parser = createASTParser({ enhancedParsing: true });
    const nodes = parser.parse(
      `
class MyClass:
    def __init__(self, name: str):
        self.name = name
    def process(self):
        pass
`,
      'python',
    );
    // Enhanced parser produces nested children
    const cls = nodes.find((n) => n.kind === 'class');
    expect(cls).toBeDefined();
    expect(cls!.name).toBe('MyClass');
    expect(cls!.children.length).toBe(2);
    expect(cls!.children[0].kind).toBe('method');
    expect(cls!.children[0].name).toBe('__init__');
  });

  it('should still use TS Compiler API for TypeScript', () => {
    const parser = createASTParser({ enhancedParsing: true });
    const nodes = parser.parse('export class Foo { bar() {} }', 'typescript');
    expect(nodes[0].kind).toBe('class');
    expect(nodes[0].name).toBe('Foo');
    expect(nodes[0].children[0].kind).toBe('method');
  });

  it('should still use TS Compiler API for JavaScript', () => {
    const parser = createASTParser({ enhancedParsing: true });
    const nodes = parser.parse('function greet() {}', 'javascript');
    expect(nodes[0].kind).toBe('function');
    expect(nodes[0].name).toBe('greet');
  });

  it('should convert enhanced ParseResult nodes to ASTNode format', () => {
    const parser = createASTParser({ enhancedParsing: true });
    const nodes = parser.parse(
      `
pub struct Config {
    name: String,
}

impl Config {
    pub fn new(name: &str) -> Self {
        Config { name: name.to_string() }
    }
}
`,
      'rust',
    );
    const struct_ = nodes.find((n) => n.name === 'Config' && n.kind === 'class');
    expect(struct_).toBeDefined();
    // Metadata should contain original type info
    expect(struct_!.metadata).toBeDefined();
    expect((struct_!.metadata as Record<string, unknown>).originalType).toBe('struct');
  });

  it('should include modifiers in metadata', () => {
    const parser = createASTParser({ enhancedParsing: true });
    const nodes = parser.parse(
      `
public class Svc {
    public void handle() {}
}
`,
      'java',
    );
    const cls = nodes[0];
    expect((cls.metadata as Record<string, unknown>).modifiers).toContain('public');
  });
});

describe('ASTParser backward compatibility', () => {
  it('should default to regex parsing (enhancedParsing=false)', () => {
    const parser = createASTParser();
    const nodes = parser.parse(
      `class Foo:\n    def bar(self):\n        pass`,
      'python',
    );
    // Regex mode: class is detected at top level, but indented def
    // is NOT detected because Python regex patterns require ^ (start of line)
    const cls = nodes.find((n) => n.kind === 'class');
    expect(cls).toBeDefined();
    expect(cls!.children.length).toBe(0); // regex doesn't nest
    // Indented def doesn't match /^(?:async\s+)?def\s+(\w+)/ in regex mode
    expect(nodes.length).toBe(1);
  });

  it('should support useEnhancedParsing() toggle', () => {
    const parser = createASTParser();

    // Regex mode
    let nodes = parser.parse('class Foo:\n    def bar(self):\n        pass', 'python');
    expect(nodes.find((n) => n.kind === 'class')!.children.length).toBe(0);

    // Toggle on
    parser.useEnhancedParsing(true);
    nodes = parser.parse('class Foo:\n    def bar(self):\n        pass', 'python');
    expect(nodes.find((n) => n.kind === 'class')!.children.length).toBe(1);
  });

  it('should keep 16 supported languages', () => {
    const parser = createASTParser();
    expect(parser.getSupportedLanguages().length).toBe(16);
  });
});

describe('ParseResult structure validation', () => {
  it('should have correct structure for all parsers', () => {
    const mlp = createMultiLanguageParser();
    for (const lang of mlp.getSupportedLanguages()) {
      const result = mlp.parse('', lang);
      expect(result.language).toBe(lang);
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.imports)).toBe(true);
      expect(Array.isArray(result.exports)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });

  it('ASTNode children should be properly typed', () => {
    const parser = new PythonParser();
    const result = parser.parse(`
class Outer:
    def method(self):
        pass
`);
    const cls = result.nodes[0];
    expect(cls.type).toBe('class');
    expect(cls.children[0].type).toBe('method');
    expect(cls.children[0].language).toBe('python');
  });
});

describe('BraceBlockTracker', () => {
  it('should track nested brace depth', () => {
    const tracker = new BraceBlockTracker();
    tracker.processLine('{ {', 1);
    expect(tracker.getCurrentDepth()).toBe(2);
    tracker.processLine('} }', 2);
    expect(tracker.getCurrentDepth()).toBe(0);
  });
});

describe('IndentBlockTracker', () => {
  it('should close blocks when indent decreases', () => {
    const tracker = new IndentBlockTracker();
    tracker.pushBlock({ type: 'class', name: 'Foo', startLine: 1 }, 0);
    tracker.pushBlock({ type: 'method', name: 'bar', startLine: 2 }, 4);
    // 'pass' at indent 0 closes both blocks (0 <= 4, then 0 <= 0)
    const { closed } = tracker.processLine('pass', 3);
    expect(closed.length).toBe(2);
  });
});
