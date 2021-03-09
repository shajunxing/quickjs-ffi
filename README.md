# Libffi wrapper, Make QuickJS easy to invoke almost any C libraries without writing C code

* [https://bellard.org/quickjs/]
* [https://github.com/bellard/quickjs]
* [https://sourceware.org/libffi/]
* [https://github.com/libffi/libffi]

Although there's already one wrapper [https://github.com/partnernetsoftware/qjs-ffi] I've found through duckduckgo, I'm not satisfied with it's principle. My opinion is better keep C code simple and stupid. Existed library functions, variables, macro definitions and all the things exposed into JS should keep their original look like as much as possible.

So I write my own from scratch. My module has two layers, low and high. Low layer is quickjs-ffi.c, compiled to quickjs-ffi.so, containing minimal necessarily things from libc, libdl, libffi, and using it is almost the same as it was. High layer is pure JS code, it's not necessary, only making low layer easy to use.

## Low layer, quickjs-ffi.so

I's very simple to compile, just "make", and will generate module lib quickjs-ffi.so, test lib test-lib.so and will run test.js.

This is a sample of how to use this module and print all members of it.

    import * as ffi from './quickjs-ffi.so'

    for (let k in ffi) {
        console.log(k, '=', ffi[k].toString());
    }

All C pointer types are actually uintptr_t in C, and number in JS, the value are exactly memory addresses.

The module exposes many constant variables, which varies by C or machine implementation or different compiling, it's necessary. For example: C int size varies, it's byte size can be obtained by "sizeof_int" member. Any "sizeof_xxx" member is actually value of sizeof(xxx).

C needs lots of memory operations, so I exposed necessary libc functions such as malloc, free, memset and memcpy, and my own functions below:

* `void fprinthex(FILE *stream, void *data, size_t size)`

## High layer, under construction
