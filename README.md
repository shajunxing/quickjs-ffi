# Libffi wrapper, Make QuickJS easy to invoke almost any C libraries without writing C code

* [https://bellard.org/quickjs/]
* [https://github.com/bellard/quickjs]
* [https://sourceware.org/libffi/]
* [https://github.com/libffi/libffi]

Although there's already one wrapper [https://github.com/partnernetsoftware/qjs-ffi] I've found through duckduckgo, to be honest I'm not satisfied with it's principle. My opinion is better keep C code simple and stupid. Existed library functions, variables, macro definitions and all the things exposed into JS should keep their original look like as much as possible.

So I wrote my own from scratch. My module has two layers, low layer is `quickjs-ffi.c`, compiled to `quickjs-ffi.so`, containing minimal necessarily things from libc, libdl, libffi, and using it is almost the same as it was, high layer is pure JS code, not necessary, only makes low layer easy to use.

## Low layer

I's very simple to compile, just `make`, and will generate module lib `quickjs-ffi.so`, test lib `test-lib.so` and will run `test.js`.

This is a sample of how to use this module and print all members of it.

    import * as ffi from './quickjs-ffi.so'

    for (let k in ffi) {
        console.log(k, '=', ffi[k].toString());
    }

Any C number types such as `int`, `float`, are all `number` in JS.

All C pointer types are actually `uintptr_t` in C, and `number` in JS, the value are exactly memory addresses.

But C `char *` string may be `string` in JS.

JS `bool` is C `bool`, in C99 there are `bool` definitions although they are actually integers.

C function with no return value, returns `undefined` in JS.

The module exposes many constant variables, which varies by C or machine implementation or different compiling, it's necessary. For example: C int size varies, it's byte size can be obtained by `sizeof_int` member. Any `sizeof_xxx` member is actually value of `sizeof(xxx)`.

I will do my best checking argument count and types, although it's not enough.

Also I will check out-of-bound error in many memory handling functions, yet still not enough, do it at your own risk.

C needs lots of memory operations, so I exposed necessary libc functions such as `malloc`, `free`, `memset` and `memcpy`, and I expanded my own functions below:

* `undefined fprinthex(pointer stream, pointer data, number size)` print a memory block like `hexdump -C` format.
* `undefined printhex(pointer data, number size)` print to stdout.
* `number memreadint(pointer buf, number buflen, number offset, bool issigned, number bytewidth)` read certain width integer from `offset` of `buf`, `buflen` is for oob checking, `bytewidth` can only be 1, 2, 4 or 8.
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

Functions in libdl and libffi are just the same as it was:

* `pointer dlopen(string/null filename, number flags)`
* `number dlclose(pointer handle)`
* `pointer dlsym(pointer handle, string symbol)`
* `number ffi_prep_cif(pointer cif, number abi, number nargs, pointer rtype, pointer atypes )`
* `undefined ffi_call (pointer cif, pointer fn, pointer rvalue, pointer avalues)`

And many necessary constant values or addresses such as `RTLD_XXX` `FFI_XXX` `ffi_type_xxx` ...

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

Here is a slightly complex example invoking `double test2(float a, double b, const char *c)` in `test-lib.so`:

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

## High layer

under construction
