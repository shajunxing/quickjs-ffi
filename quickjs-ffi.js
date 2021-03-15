/*
MIT License

Copyright (c) 2021 shajunxing

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import * as ffi from './quickjs-ffi.so'

const dlCache = {}; // {'filename': {handle: ..., symbols: {'...': ...}}}

function dlOpen(filename) {
    if (dlCache.hasOwnProperty(filename)) {
        return dlCache[filename];
    }
    // console.log(filename);
    let h = ffi.dlopen(filename, ffi.RTLD_NOW);
    if (h === 0) {
        throw new TypeError(ffi.dlerror());
    }
    let file = { handle: h, symbols: {} };
    dlCache[filename] = file;
    return file;
}

function dlSym(filename, symbol) {
    let file = dlOpen(filename);
    if (file.symbols.hasOwnProperty(symbol)) {
        return file.symbols[symbol];
    }
    // console.log(filename, symbol);
    let pointer = ffi.dlsym(file.handle, symbol);
    if (pointer === 0) {
        throw new TypeError(dlerror());
    }
    file.symbols[symbol] = pointer;
    return pointer;
}

function dlClose(filename) {
    if (dlCache.hasOwnProperty(filename)) {
        ffi.dlclose(dlCache[filename].handle);
        delete dlCache[filename];
    }
}

const dummy = () => { }

const rint = (issigned, bytewidth) =>
    ptr => ffi.memreadint(ptr, bytewidth, 0, issigned, bytewidth);

const wint = bytewidth =>
    (ptr, val) => ffi.memwriteint(ptr, bytewidth, 0, bytewidth, val);

const rfloat = isdouble =>
    ptr => ffi.memreadfloat(ptr, isdouble ? 8 : 4, 0, isdouble);

const wfloat = isdouble =>
    (ptr, val) => ffi.memwritefloat(ptr, isdouble ? 8 : 4, 0, isdouble, val);

const primitive_types = {
    'void': [ffi.ffi_type_void, 0, dummy, dummy],
    'uint8_t': [ffi.ffi_type_uint8, 1, rint(false, 1), wint(1)],
    'int8_t': [ffi.ffi_type_sint8, 1, rint(true, 1), wint(1)],
    'uint16_t': [ffi.ffi_type_uint16, 2, rint(false, 2), wint(2)],
    'int16_t': [ffi.ffi_type_sint16, 2, rint(true, 2), wint(2)],
    'uint32_t': [ffi.ffi_type_uint32, 4, rint(false, 4), wint(4)],
    'int32_t': [ffi.ffi_type_sint32, 4, rint(true, 4), wint(4)],
    'uint64_t': [ffi.ffi_type_uint64, 8, rint(false, 8), wint(8)],
    'int64_t': [ffi.ffi_type_sint64, 8, rint(true, 8), wint(8)],
    'float': [ffi.ffi_type_float, 4, rfloat(false), wfloat(false)],
    'double': [ffi.ffi_type_double, 8, rfloat(true), wfloat(true)],
    'pointer': [ffi.ffi_type_pointer, ffi.sizeof_uintptr_t, rint(false, ffi.sizeof_uintptr_t), wint(ffi.sizeof_uintptr_t)],
    'longdouble': [ffi.ffi_type_longdouble, 8, rfloat(true), wfloat(true)],
    'complex_float': [ffi.ffi_type_complex_float, undefined, undefined, undefined],
    'complex_double': [ffi.ffi_type_complex_double, undefined, undefined, undefined],
    'complex_longdouble': [ffi.ffi_type_complex_longdouble, undefined, undefined, undefined],
    'uchar': [ffi.ffi_type_uchar, 1, rint(false, 1), wint(1)],
    'char': [ffi.ffi_type_schar, 1, rint(true, 1), wint(1)],
    'ushort': [ffi.ffi_type_ushort, 2, rint(false, 2), wint(2)],
    'short': [ffi.ffi_type_sshort, 2, rint(true, 2), wint(2)],
    'uint': [ffi.ffi_type_uint, ffi.sizeof_int, rint(false, ffi.sizeof_int), wint(ffi.sizeof_int)],
    'int': [ffi.ffi_type_sint, ffi.sizeof_int, rint(true, ffi.sizeof_int), wint(ffi.sizeof_int)],
    'ulong': [ffi.ffi_type_ulong, 8, rint(false, 8), wint(8)],
    'long': [ffi.ffi_type_slong, 8, rint(true, 8), wint(8)],
    'uintptr_t': [ffi.ffi_type_uintptr_t, ffi.sizeof_uintptr_t, rint(false, ffi.sizeof_uintptr_t), wint(ffi.sizeof_uintptr_t)],
    'intptr_t': [ffi.ffi_type_intptr_t, ffi.sizeof_uintptr_t, rint(true, ffi.sizeof_uintptr_t), wint(ffi.sizeof_uintptr_t)],
    'size_t': [ffi.ffi_type_size_t, ffi.sizeof_size_t, rint(false, ffi.sizeof_size_t), wint(ffi.sizeof_size_t)],
    'string': [ffi.ffi_type_pointer, ffi.sizeof_uintptr_t, rint(false, ffi.sizeof_uintptr_t), wint(ffi.sizeof_uintptr_t)],
}

class MemoryAllocator {
    pointers = []
    alloc = size => {
        let ptr = ffi.malloc(size);
        this.pointers.push(ptr);
        return ptr;
    }
    free = () => {
        while (this.pointers.length > 0) {
            ffi.free(this.pointers.pop());
        }
    }
}

function alloc_uintptr_array(mem, ...vals) {
    let buflen = ffi.sizeof_uintptr_t * vals.length;
    let buf = mem.alloc(buflen);
    for (let i = 0; i < vals.length; i++) {
        ffi.memwriteint(buf, buflen, ffi.sizeof_uintptr_t * i, ffi.sizeof_uintptr_t, vals[i]);
    }
    return buf;
}

function alloc_struct_type(mem, ...elems) {
    let typ = mem.alloc(ffi.sizeof_ffi_type);
    ffi.memset(typ, 0, ffi.sizeof_ffi_type);
    ffi.memwriteint(typ, ffi.sizeof_ffi_type, ffi.offsetof_ffi_type_type, 2, ffi.FFI_TYPE_STRUCT);
    ffi.memwriteint(typ, ffi.sizeof_ffi_type, ffi.offsetof_ffi_type_elements, ffi.sizeof_uintptr_t,
        alloc_uintptr_array(mem, ...elems, ffi.NULL));
    return typ;
}

function get_struct_offsets(struct_typ, elem_count) {
    let ptr = ffi.malloc(ffi.sizeof_size_t * elem_count);
    let status = ffi.ffi_get_struct_offsets(ffi.FFI_DEFAULT_ABI, struct_typ, ptr);
    if (status != ffi.FFI_OK) {
        ffi.free(ptr);
        throw new TypeError('get_struct_offsets failed with return code ' + status);
    }
    let offsets = []
    for (let i = 0; i < elem_count; i++) {
        // convert BigInt to Number to prevent TypeError
        offsets.push(Number(ffi.memreadint(ptr, ffi.sizeof_size_t * 100, ffi.sizeof_size_t * i, false, ffi.sizeof_size_t)))
    }
    ffi.free(ptr);
    return offsets;
}

function parse_type(mem, repr) {
    let total_elements = 0;
    let element_representations = []
    let read_functions = [];
    let write_functions = [];

    class Node {
        ffi_type = null;
        width = null;
        abs_offset = 0;
        children = null;
        children_rel_offsets = null;
    }

    function build_tree(mem, repr) {
        if (typeof repr === 'string') {
            if (!primitive_types.hasOwnProperty(repr)) {
                throw new TypeError('primitive type \"' + repr + '\" not supported');
            }
            element_representations.push(repr);
            read_functions.push(primitive_types[repr][2]);
            write_functions.push(primitive_types[repr][3]);
            total_elements++;
            let node = new Node();
            node.ffi_type = primitive_types[repr][0];
            node.width = primitive_types[repr][1];
            return node;
        } else if (Array.isArray(repr)) {
            let node = new Node();
            node.children = [];
            for (let pr of repr) {
                node.children.push(build_tree(mem, pr));
            }
            node.ffi_type = alloc_struct_type(mem, ...node.children.map(child => child.ffi_type));
            node.children_rel_offsets = get_struct_offsets(node.ffi_type, node.children.length);
            return node;
        } else {
            throw new TypeError('type representation neither string nor array');
        }
    }

    let root = build_tree(mem, repr);

    let elements_offset = [];
    let last_primitive_element_offset = 0;
    let last_primitive_element_width = 0;

    function walk_tree(node) {
        if (node.children !== null) {
            for (let i = 0; i < node.children.length; i++) {
                node.children[i].abs_offset = node.children_rel_offsets[i] + node.abs_offset;
                walk_tree(node.children[i]);
            }
        } else {
            elements_offset.push(node.abs_offset);
            last_primitive_element_offset = node.abs_offset;
            last_primitive_element_width = node.width;
        }
    }

    walk_tree(root);

    let ret = {
        typ: root.ffi_type,
        nbytes: last_primitive_element_offset + last_primitive_element_width,
        nelems: total_elements,
        ereprs: element_representations,
        offsets: elements_offset,
        rfuncs: read_functions,
        wfuncs: write_functions,
    };

    // for (let k in ret) {
    //     console.log(k, ret[k]);
    // }

    return ret;
}

const cifCache = {};

function prepCif(rrepr, ...areprs) {
    let index = JSON.stringify([rrepr, [areprs]]);
    if (cifCache.hasOwnProperty(index)) {
        return cifCache[index];
    }
    let mem = new MemoryAllocator();
    let nargs = areprs.length;
    let aparsed = areprs.map(repr => parse_type(mem, repr));
    let rparsed = parse_type(mem, rrepr);
    let atypes = alloc_uintptr_array(mem, ...aparsed.map(parsed => parsed.typ));
    let rtype = rparsed.typ;
    let cif = mem.alloc(ffi.sizeof_ffi_cif);
    let status = ffi.ffi_prep_cif(cif, ffi.FFI_DEFAULT_ABI, nargs, rtype, atypes);
    if (status != ffi.FFI_OK) {
        mem.free();
        throw new TypeError('ffi_prep_cif failed with return code ' + status);
    }
    let cache = { mem: mem, cif: cif, rparsed: rparsed, aparsed: aparsed };
    cifCache[index] = cache;
    return cache;
}

function freeCif(rrepr, ...areprs) {
    let index = JSON.stringify([rrepr, [areprs]]);
    if (cifCache.hasOwnProperty(index)) {
        cifCache[index].mem.free();
        delete cifCache[index];
    }
}

class CStringAllocator {
    pointers = []
    to = s => {
        let cstr = ffi.tocstring(s);
        this.pointers.push(cstr);
        return cstr;
    }
    free = () => {
        while (this.pointers.length > 0) {
            ffi.freecstring(this.pointers.pop());
        }
    }
}

export class CFunction {
    mem = new MemoryAllocator();
    cstr = new CStringAllocator();
    cif;
    fn;
    rvar;
    avars;
    avar_list = [];
    rread;
    rnelems;
    aread;
    awrite;
    constructor(filename, symbol, rrepr, ...areprs) {
        this.fn = dlSym(filename, symbol);
        let c = prepCif(rrepr, ...areprs);
        this.cif = c.cif;
        this.rvar = this.mem.alloc(c.rparsed.nbytes);
        this.rread = e => c.rparsed.rfuncs[e](this.rvar + c.rparsed.offsets[e]);
        this.rnelems = c.rparsed.nelems;
        this.rereprs = c.rparsed.ereprs;
        this.avar_list = c.aparsed.map(ap => this.mem.alloc(ap.nbytes));
        this.avars = alloc_uintptr_array(this.mem, ...this.avar_list);
        this.aread = (a, e) => c.aparsed[a].rfuncs[e](this.avar_list[a] + c.aparsed[a].offsets[e]);
        this.awrite = (a, e, val) => c.aparsed[a].wfuncs[e](this.avar_list[a] + c.aparsed[a].offsets[e], val);
        this.aereprs = c.aparsed.map(ap => ap.ereprs);
    }
    invoke = (...args) => {
        for (let a = 0; a < args.length; a++) {
            let arg = args[a];
            if (Array.isArray(arg)) {
                for (let e = 0; e < arg.length; e++) {
                    this.aereprs[a][e] == 'string' ? this.awrite(a, e, this.cstr.to(arg[e])) : this.awrite(a, e, arg[e]);
                }
            } else {
                this.aereprs[a][0] == 'string' ? this.awrite(a, 0, this.cstr.to(arg)) : this.awrite(a, 0, arg);
            }
        }
        ffi.ffi_call(this.cif, this.fn, this.rvar, this.avars);
        let ret;
        if (this.rnelems == 1) {
            ret = this.rereprs[0] == 'string' ? ffi.newstring(this.rread(0)) : this.rread(0);
        } else {
            ret = [];
            for (let e = 0; e < this.rnelems; e++) {
                this.rereprs[e] == 'string' ? ret.push(ffi.newstring(this.rread(e))) : ret.push(this.rread(e));
            }
        }
        this.cstr.free();
        return ret;
    }
    free = () => {
        this.mem.free();
        this.cstr.free();
    }
}



