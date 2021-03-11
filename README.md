# Libffi wrapper, Make QuickJS able to invoke almost any C libraries without writing C code

## License

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

## Intruduction

* <https://bellard.org/quickjs/>
* <https://github.com/bellard/quickjs>
* <https://sourceware.org/libffi/>
* <https://github.com/libffi/libffi>

Although there's already one wrapper <https://github.com/partnernetsoftware/qjs-ffi> I found through duckduckgo, to be honest I'm not satisfied with this principle. My opinion is better to keep C code simple and stupid, and put complex logic into JS. Existing library functions, variables, macro definitions and all the things exposed should keep their original look as much as possible.

So I wrote my own from scratch. My module has two layers, low layer is `quickjs-ffi.c`, compiled to `quickjs-ffi.so`, containing minimal necessary things from libc, libdl, libffi, and using it is almost the same as it was in C, high layer is pure JS code, not necessary, only makes low layer easy to use.

## Low layer

I's quite east to compile, just `make`, it will produce module `quickjs-ffi.so`, test lib `test-lib.so` and will run `test.js`.

This is an example of importing this module and print all it's members:

    import * as ffi from './quickjs-ffi.so'

    for (let k in ffi) {
        console.log(k, '=', ffi[k].toString());
    }

Some rules:

* Any C number types such as `int`, `float`, are all `number` in JS.
* All C pointer types are actually `uintptr_t` in C, and `number` in JS, the value are exactly memory addresses.
* C `char *` string can be `string` in JS.
* JS `bool` is C `bool`, in C99 there are `bool` definitions although they are actually integers.
* C functions which have no return value, will return `undefined` in JS.

The module exposes many constant values, which varies by C or machine implementation or different compiling, it's necessary. For example: C int size varies, which byte size can be obtained by `sizeof_int` module member. Any `sizeof_xxx` is actually value of `sizeof(xxx)`. Also in order to properly handle structure members, I exposed some `offsetof_xxx_yyy` values which means `offsetof(xxx, yyy)` in C.

I will do my best checking arguments, including their count and types, although I know it's not enough.

Also I will check out-of-bound error in many memory handling functions, yet still not enough, so do it at your own risk.

C needs lots of memory operations, so I exposed necessary libc functions such as `malloc`, `free`, `memset` and `memcpy`:

* `pointer malloc(number size)`
* `undefined free(pointer ptr)`
* `pointer memset(pointer s, number c, number n)`
* `pointer memcpy(pointer dest, pointer src, number n)`

And added my own functions below:

* `undefined fprinthex(pointer stream, pointer data, number size)` print a memory block like `hexdump -C` format.
* `undefined printhex(pointer data, number size)` print to stdout.
* `number memreadint(pointer buf, number buflen, number offset, bool issigned, number bytewidth)` read specified width integer from `offset` of `buf`, `buflen` is for oob checking, `bytewidth` can only be 1, 2, 4 or 8.
* `undefined memwriteint(pointer buf, number buflen, number offset, number bytewidth, number val)` write integer `val` to `offset`, signed/unsigned is not necessary to speciy.
* `number memreadfloat(pointer buf, number buflen, number offset, bool isdouble)` read float/double from `offset`, in C float is always 4 bytes and double is 8.
* `undefined memwritefloat(pointer buf, number buflen, number offset, bool isdouble, double val)` write float/double `val` to `offset`.
* `string memreadstring(pointer buf, number buflen, number offset, number len)` read `len` bytes from `offset`, return JS string.
* `string memwritestring(pointer buf, number buflen, number offset, number str)` write `str` to `offset`.

Here is an example:

    let buflen = 8;
    let buf = ffi.malloc(buflen);
    ffi.printhex(buf, buflen);
    ffi.memset(buf, 0xff, buflen);
    ffi.printhex(buf, buflen);
    console.log(
        ffi.memreadint(buf, buflen, 0, true, 1),
        ffi.memreadint(buf, buflen, 0, true, 2),
        ffi.memreadint(buf, buflen, 0, true, 4),
        ffi.memreadint(buf, buflen, 0, true, 8),
        ffi.memreadint(buf, buflen, 0, false, 1),
        ffi.memreadint(buf, buflen, 0, false, 2),
        ffi.memreadint(buf, buflen, 0, false, 4),
        ffi.memreadint(buf, buflen, 0, false, 8)
    );
    ffi.memwriteint(buf, buflen, 6, 2, 0x1234);
    ffi.printhex(buf, buflen);
    console.log(ffi.memreadint(buf, buflen, 6, false, 2).toString(16));
    ffi.memwritestring(buf, buflen, 2, "hello");
    ffi.printhex(buf, buflen);
    print(ffi.memreadstring(buf, buflen, 2, 5));
    ffi.memwritefloat(buf, buflen, 0, true, 6.66666666666666666666666666);
    ffi.printhex(buf, buflen);
    console.log(ffi.memreadfloat(buf, buflen, 0, true));
    ffi.free(buf);

Functions in `libdl` and `libffi` are almost the same as it's C style:

* `pointer dlopen(string/null filename, number flags)`
* `number dlclose(pointer handle)`
* `pointer dlsym(pointer handle, string symbol)`
* `string/null dlerror()`
* `number ffi_prep_cif(pointer cif, number abi, number nargs, pointer rtype, pointer atypes )`
* `undefined ffi_call (pointer cif, pointer fn, pointer rvalue, pointer avalues)`

And many necessary constant values or addresses such as `RTLD_XXX` `FFI_XXX` `ffi_type_xxx` are exposed.

**Cautions:**

* Since there is no way to define C numeric variables in JS, only dynamic creation using `malloc` is reasonable, so don't forget to `free` them when no longer use.
* `ffi_type_xxx` are pointers, eg. memory addresses.

Here is a simple example invoking `void test1()` in `test-lib.so`:

    let handle = ffi.dlopen("test-lib.so", ffi.RTLD_NOW);
    console.log(handle);
    let test1 = ffi.dlsym(handle, 'test1');
    console.log(test1);
    let cif = ffi.malloc(ffi.sizeof_ffi_cif);
    console.log(ffi.ffi_prep_cif(cif, ffi.FFI_DEFAULT_ABI, 0, ffi.ffi_type_void, 0));
    ffi.ffi_call(cif, test1, 0, 0)
    ffi.free(cif);
    console.log(ffi.dlclose(handle));

And here is a slightly complex example invoking `double test2(float a, double b, const char *c)`:

    let handle = ffi.dlopen('test-lib.so', ffi.RTLD_NOW);
    if (handle != ffi.NULL) {
        let test2 = ffi.dlsym(handle, 'test2');
        if (test2 != ffi.NULL) {
            let cif = ffi.malloc(ffi.sizeof_ffi_cif);
            let nargs = 3;
            let rtype = ffi.ffi_type_double;
            let atypes_size = ffi.sizeof_uintptr_t * 3;
            let atypes = ffi.malloc(atypes_size);
            ffi.memwriteint(atypes, atypes_size, ffi.sizeof_uintptr_t * 0, ffi.sizeof_uintptr_t, ffi.ffi_type_float);
            ffi.memwriteint(atypes, atypes_size, ffi.sizeof_uintptr_t * 1, ffi.sizeof_uintptr_t, ffi.ffi_type_double);
            ffi.memwriteint(atypes, atypes_size, ffi.sizeof_uintptr_t * 2, ffi.sizeof_uintptr_t, ffi.ffi_type_pointer);
            if (ffi.ffi_prep_cif(cif, ffi.FFI_DEFAULT_ABI, nargs, rtype, atypes) == ffi.FFI_OK) {
                let arg1 = ffi.malloc(4);
                ffi.memwritefloat(arg1, 4, 0, false, 3.141592654);
                let arg2 = ffi.malloc(8);
                ffi.memwritefloat(arg2, 8, 0, true, 2.718281829);
                let str = ffi.malloc(1000);
                ffi.memwritestring(str, 1000, 0, "How do you do?");
                let arg3 = ffi.malloc(ffi.sizeof_uintptr_t);
                ffi.memwriteint(arg3, ffi.sizeof_uintptr_t, 0, ffi.sizeof_uintptr_t, str);
                let avalues_size = ffi.sizeof_uintptr_t * 3;
                let avalues = ffi.malloc(avalues_size);
                ffi.memwriteint(avalues, avalues_size, ffi.sizeof_uintptr_t * 0, ffi.sizeof_uintptr_t, arg1);
                ffi.memwriteint(avalues, avalues_size, ffi.sizeof_uintptr_t * 1, ffi.sizeof_uintptr_t, arg2);
                ffi.memwriteint(avalues, avalues_size, ffi.sizeof_uintptr_t * 2, ffi.sizeof_uintptr_t, arg3);
                let rvalue = ffi.malloc(8);
                ffi.ffi_call(cif, test2, rvalue, avalues);
                console.log(ffi.memreadfloat(rvalue, 8, 0, true));
                ffi.free(rvalue);
                ffi.free(avalues);
                ffi.free(arg3);
                ffi.free(str);
                ffi.free(arg2);
                ffi.free(arg1);
            }
            ffi.free(atypes);
            ffi.free(cif);
        }
        ffi.dlclose(handle);
    }

In libffi document there are detailed instructions on how to pass C structures. Here is an example. Two nested Structure definition and a function `test3()` to be called:

    typedef struct {
        int i;
        float f;
    } s1;

    typedef struct {
        long l;
        double d;
        s1 s;
    } s2;

    void test3(s2 s) {
        ...
    }

JS code looks very similar to C, except almost all variables are dynamically created, so be very careful handling memories and pointers. I will make it easier in high layer.

    let handle = ffi.dlopen('test-lib.so', ffi.RTLD_NOW);
    if (handle != ffi.NULL) {
        let test3 = ffi.dlsym(handle, 'test3');
        if (test3 != ffi.NULL) {
            let cif = ffi.malloc(ffi.sizeof_ffi_cif);
            let atypes = ffi.malloc(ffi.sizeof_uintptr_t);

            let s1_elements = ffi.malloc(ffi.sizeof_uintptr_t * 3);
            ffi.memwriteint(s1_elements, ffi.sizeof_uintptr_t * 3, ffi.sizeof_uintptr_t * 0, ffi.sizeof_uintptr_t, ffi.ffi_type_sint);
            ffi.memwriteint(s1_elements, ffi.sizeof_uintptr_t * 3, ffi.sizeof_uintptr_t * 1, ffi.sizeof_uintptr_t, ffi.ffi_type_float);
            ffi.memwriteint(s1_elements, ffi.sizeof_uintptr_t * 3, ffi.sizeof_uintptr_t * 2, ffi.sizeof_uintptr_t, ffi.NULL);

            let s1 = ffi.malloc(ffi.sizeof_ffi_type);
            // I wrote C code, filled ffi_type members one by one with -1, and got it's structure is:
            // "size" 8 bytes, "alignment" 2 bytes, "type" 2 bytes, useless blank 4 bytes, "**elements" 8 bytes
            // I don't know why 4 bytes blank exists, C structure alignment rule?
            // In order to solve this problem, I added some "offsetof_xxx" members.
            ffi.memset(s1, 0, ffi.sizeof_ffi_type);
            ffi.memwriteint(s1, ffi.sizeof_ffi_type, ffi.offsetof_ffi_type_type, 2, ffi.FFI_TYPE_STRUCT);
            ffi.memwriteint(s1, ffi.sizeof_ffi_type, ffi.offsetof_ffi_type_elements, ffi.sizeof_uintptr_t, s1_elements);

            let s2_elements = ffi.malloc(ffi.sizeof_uintptr_t * 4);
            ffi.memwriteint(s2_elements, ffi.sizeof_uintptr_t * 4, ffi.sizeof_uintptr_t * 0, ffi.sizeof_uintptr_t, ffi.ffi_type_slong);
            ffi.memwriteint(s2_elements, ffi.sizeof_uintptr_t * 4, ffi.sizeof_uintptr_t * 1, ffi.sizeof_uintptr_t, ffi.ffi_type_double);
            ffi.memwriteint(s2_elements, ffi.sizeof_uintptr_t * 4, ffi.sizeof_uintptr_t * 2, ffi.sizeof_uintptr_t, s1);
            ffi.memwriteint(s2_elements, ffi.sizeof_uintptr_t * 4, ffi.sizeof_uintptr_t * 3, ffi.sizeof_uintptr_t, ffi.NULL);

            let s2 = ffi.malloc(ffi.sizeof_ffi_type);
            ffi.memset(s2, 0, ffi.sizeof_ffi_type);
            ffi.memwriteint(s2, ffi.sizeof_ffi_type, ffi.offsetof_ffi_type_type, 2, ffi.FFI_TYPE_STRUCT);
            ffi.memwriteint(s2, ffi.sizeof_ffi_type, ffi.offsetof_ffi_type_elements, ffi.sizeof_uintptr_t, s2_elements);

            ffi.printhex(s1, ffi.sizeof_ffi_type)
            ffi.printhex(s2, ffi.sizeof_ffi_type)

            ffi.memwriteint(atypes, ffi.sizeof_uintptr_t, 0, ffi.sizeof_uintptr_t, s2);

            if (ffi.ffi_prep_cif(cif, ffi.FFI_DEFAULT_ABI, 1, ffi.ffi_type_void, atypes) == ffi.FFI_OK) {
                let sizeof_struct_s2 = 24;
                let arg1 = ffi.malloc(sizeof_struct_s2);
                ffi.memwriteint(arg1, sizeof_struct_s2, 0, 8, 123456789);
                ffi.memwritefloat(arg1, sizeof_struct_s2, 8, true, 3.141592654);
                ffi.memwriteint(arg1, sizeof_struct_s2, 16, 4, 54321);
                ffi.memwritefloat(arg1, sizeof_struct_s2, 20, false, 2.718281829);

                let avalues_size = ffi.sizeof_uintptr_t;
                let avalues = ffi.malloc(avalues_size);
                ffi.memwriteint(avalues, avalues_size, 0, ffi.sizeof_uintptr_t, arg1);

                ffi.ffi_call(cif, test3, ffi.NULL, avalues);

                ffi.memset(arg1, 0xff, sizeof_struct_s2);
                ffi.ffi_call(cif, test3, ffi.NULL, avalues);

                ffi.free(avalues);
                ffi.free(arg1);
            }

            ffi.free(s2);
            ffi.free(s2_elements);
            ffi.free(s1);
            ffi.free(s1_elements);
            ffi.free(atypes);
            ffi.free(cif);
        }
        ffi.dlclose(handle);
    }

## High layer

I've wrapped many repeated operations in `quickjs-ffi.js`. Now previous example is quite a lot simplified.

**Cautions:** high layer will definitely and frequently be changed. I can only promise to do my best to keep low layer unchanged, but not high layer. Of course you can write your own wrapper, everyone has his own idea and I will accept good ones. For example, maybe there is more graceful way to free unused pointers.

Simplified example code is here:

    import {
        malloc, free, memset, memreadfloat, memwriteint, memwritefloat, NULL,
        ffi_call,
        ffi_type_void, ffi_type_float, ffi_type_double, ffi_type_pointer, ffi_type_sint, ffi_type_slong,
    } from './quickjs-ffi.so'

    import {
        dl_cached_open_sym, dl_cached_close,
        ffi_malloc_prep_cif, malloc_uintptr_array, malloc_string, malloc_float, malloc_double, malloc_uintptr, malloc_ffi_type_struct
    } from './quickjs-ffi.js'

    {
        let test1 = dl_cached_open_sym('test-lib.so', 'test1');
        let cif = ffi_malloc_prep_cif(0, ffi_type_void, 0);
        ffi_call(cif, test1, 0, 0);
        free(cif);
    }

    {
        let test2 = dl_cached_open_sym('test-lib.so', 'test2');
        let atypes = malloc_uintptr_array(ffi_type_float, ffi_type_double, ffi_type_pointer);
        let cif = ffi_malloc_prep_cif(3, ffi_type_double, atypes);
        let arg1 = malloc_float(3.141592654);
        let arg2 = malloc_double(2.718281829);
        let str = malloc_string(1000, 'How do you do?');
        let arg3 = malloc_uintptr(str);
        let avalues = malloc_uintptr_array(arg1, arg2, arg3);
        let rvalue = malloc(8);
        ffi_call(cif, test2, rvalue, avalues);
        console.log(memreadfloat(rvalue, 8, 0, true));
        free(rvalue);
        free(avalues);
        free(arg3);
        free(str);
        free(arg2);
        free(arg1);
        free(atypes);
        free(cif);
    }

    {
        let test3 = dl_cached_open_sym('test-lib.so', 'test3');
        let s1_elements = malloc_uintptr_array(ffi_type_sint, ffi_type_float, NULL);
        let s1 = malloc_ffi_type_struct(s1_elements);
        let s2_elements = malloc_uintptr_array(ffi_type_slong, ffi_type_double, s1, NULL);
        let s2 = malloc_ffi_type_struct(s2_elements);
        let atypes = malloc_uintptr_array(s2);
        let cif = ffi_malloc_prep_cif(1, ffi_type_void, atypes);
        let sizeof_struct_s2 = 24;
        let arg1 = malloc(sizeof_struct_s2);
        memwriteint(arg1, sizeof_struct_s2, 0, 8, 123456789);
        memwritefloat(arg1, sizeof_struct_s2, 8, true, 3.141592654);
        memwriteint(arg1, sizeof_struct_s2, 16, 4, 54321);
        memwritefloat(arg1, sizeof_struct_s2, 20, false, 2.718281829);
        let avalues = malloc_uintptr_array(arg1);
        ffi_call(cif, test3, NULL, avalues);
        memset(arg1, 0xff, sizeof_struct_s2);
        ffi_call(cif, test3, NULL, avalues);
        free(avalues);
        free(arg1);
        free(s2);
        free(s2_elements);
        free(s1);
        free(s1_elements);
        free(atypes);
        free(cif);
    }

    dl_cached_close('test-lib.so');
