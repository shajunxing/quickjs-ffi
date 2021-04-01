# Libffi wrapper for QuickJS. Now supports almost every features of C including primitive types, structs, callbacks and so on

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

## Links

* quickjs-ffi <https://github.com/shajunxing/quickjs-ffi> *Any issues please report here*
* quickjs-ffi <https://gitee.com/mirrors/quickjs-ffi> *Due to some well known reasons, here is China mirror*
* quickjs-misc <https://github.com/shajunxing/quickjs-misc> *My miscellaneous modules which can be seen as examples*
* quickjs <https://bellard.org/quickjs/>
* quickjs <https://github.com/bellard/quickjs>
* libffi <https://sourceware.org/libffi/>
* libffi <https://github.com/libffi/libffi>

## Intruduction

Although there's already one wrapper <https://github.com/partnernetsoftware/qjs-ffi> I found through duckduckgo, to be honest I'm not satisfied with this design. My idea is to keep C code as simple as possible, and put complex logic into JS. Existing library functions, variables, macro definitions and all the things exposed should keep their original look as much as possible.

So I wrote my own from scratch. My module has two layers, low layer is `quickjs-ffi.c`, compiled to `quickjs-ffi.so`, containing minimal necessary things from libc, libdl, libffi, and using it is almost the same as C, high layer `quickjs-ffi.js`  makes low layer easy to use.

It's east to compile, just `make`, it will produce module `quickjs-ffi.so`, test lib `test-lib.so` and will run `test.js`.

## High layer

**Now it's quite a lot simplified**, although I can still only promise to keep low layer unchanged, but not high layer.

Assume 3 C functions (defined in `test-lib.c`):

    void test1();
    double test2(float a, double b, const char *c);
    typedef struct {
        int i;
        float f;
    } s1;
    typedef struct {
        long l;
        double d;
        s1 s;
    } s2;
    void test3(s2 s);

They can be invoked in JS like this:

    import { CFunction } from './quickjs-ffi.js'
    let test1 = new CFunction('test-lib.so', 'test1', null, 'void');
    let test2 = new CFunction('test-lib.so', 'test2', null, 'double', 'float', 'double', 'string');
    let test3 = new CFunction('test-lib.so', 'test3', null, 'void', ['long', 'double', ['int', 'float']]);
    test1.invoke();
    console.log(test2.invoke(3.141592654, 2.718281829, 'How do you do?'));
    test3.invoke([123456789, 3.141592654, 54321, 2.718281829]);

`CFunction`'s constructor definition is:

    library name, function name, nfixedargs, return value type representation, ...arguments type representation

If C function arguments length is fixed, `nfixedargs` must be null, or be the number of fixed arguments.

Primitive types are representated by short string literals according to `libffi`'s type definition, I renamed some of it to more C friendly, and also added some, see `primitive_types` in `quickjs-ffi.js` for details. **Note:** All C pointers are `pointers`, they are actually memory addresses. but `char *` can be represented by `string`, and will automatically inbox/outbox with JS string, inbox is not safe and may cause pointer oob, you know that, so do it at your own risk. C complex type is not yet supported.

Structure types are represented by array of primitive types. Nested structures must be defined by nested array, but putting/getting element values must be flattened, which means all structure's primitive elements, are in natural order, eg. 'depth first' order.

If function's return value is structure type, it will returns a flattened array.

High layer caches `dlopen`, `dlsym` and `ffi_prep_cif` results, including corresponding memory allocations. Same library and function will only load once, and also will be cif of same function definitions, eg. same arguments and return value representation.

Each `CFunction` instance shares dl and ffi cache, but keep it's own memory allocations for arguments and return value, this design is for possible multithread situation.

To invoke C functions with variadic arguments such as `printf`, if the function definition is fully dynamic, don't forget to free resources when no longer used. And **Cautions:** Be very carefully dealing with type promotions of C variadic function arguments. See C standards for details. Here is an example:

    import { CFunction, freeCif } from './quickjs-ffi.js'
    import { LIBC_SO } from './quickjs-ffi.so'
    let printf = new CFunction(LIBC_SO, 'printf', 1, 'int', 'string', 'double', 'double', 'int');
    printf.invoke('%g %g %d\n', 3.141592654, 2.718281829, 299792458);
    freeCif(printf.cifcacheindex);
    printf.free();
    printf = new CFunction(LIBC_SO, 'printf', 1, 'int', 'string', 'string', 'string');
    printf.invoke('%s %s\n', 'hello', 'world');
    freeCif(printf.cifcacheindex);
    printf.free();

C callbacks are fully supported by `CCallback` class, which will wrap a JS function using libffi closure mechanism, and returns a C function pointer which can be used as another C function's parameter. `CCallback`'s constructor is:

    JS function, nfixedargs, return value type representation, ...arguments type representation

Return value and arguments definitions are the same as `CFunction`.

For example, there are test4 in `test-lib.c`:

    char *test4(s2 (*fn)(float, double, const char *)) {
        puts("test4 begins");
        s2 ret = fn(3.141592654, 2.718281829, "Hi there");
        printf("callback returns %ld %f %d %f\n", ret.l, ret.d, ret.s.i, ret.s.f);
        puts("test4 ends");
        return "greetings";
    }

Define and execute a JS callback is:

    import * as ffi from './quickjs-ffi.js'
    let test4 = new ffi.CFunction('test-lib.so', 'test4', null, 'string', 'pointer');
    let cb = new ffi.CCallback((a, b, c) => {
        console.log('callback begins');
        console.log('arguments are', a, b, c);
        console.log('callback ends');
        return [1, 2, 3, 4];
    }, null, ['long', 'double', ['int', 'float']], 'float', 'double', 'string');
    console.log('test4 returns', test4.invoke(cb.cfuncptr));

Which will output:

    test4 begins
    callback begins
    arguments are 3.1415927410125732 2.718281829 Hi there
    callback ends
    callback returns 1 2.000000 3 4.000000
    test4 ends
    test4 returns greetings

## Low layer

This is an example of importing this module and print all exports:

    import * as ffi from './quickjs-ffi.so'

    for (let k in ffi) {
        console.log(k, '=', ffi[k].toString());
    }

Some rules:

* Any C numeric types such as `int`, `float`, are all `number` in JS.
* All C pointer types are actually `uintptr_t` in C, and `number` in JS, the value are exactly memory addresses.
* C `char *` string can be `string` in JS.
* JS `bool` is C `bool`, in C99 there are `bool` definitions although they are actually integers.
* C functions which have no return value, will return `undefined` in JS.

The module exposes many constant values, which varies by C or machine implementation or different compilations, it's necessary. For example: C int size varies, so i exposed `sizeof_int`. Any `sizeof_xxx` is actually value of `sizeof(xxx)`. Also in order to properly operate structure members, I exposed some `offsetof_xxx_yyy` values which means `offsetof(xxx, yyy)` in C.

I will do my best checking function arguments, including their count and types, although I know it's not enough.

C needs lots of memory operations, so I exposed necessary libc functions as below:

* `pointer malloc(number size)`
* `undefined free(pointer ptr)`
* `pointer memset(pointer s, number c, number n)`
* `pointer memcpy(pointer dest, pointer src, number n)`
* `number strlen(pointer s)`

And I added my own functions below. Also I will check out-of-bound error in them, yet still not enough, so do it at your own risk.

* `undefined fprinthex(pointer stream, pointer data, number size)` <br>print a memory block like `hexdump -C` format.
* `undefined printhex(pointer data, number size)` <br>print to stdout.
* `number memreadint(pointer buf, number buflen, number offset, bool issigned, number bytewidth)` <br>read specified width integer from `offset` of `buf`, `buflen` is for oob checking, `bytewidth` can only be 1, 2, 4 or 8.
* `undefined memwriteint(pointer buf, number buflen, number offset, number bytewidth, number val)` <br>write integer `val` to `offset`, signed/unsigned is not necessary to speciy.
* `number memreadfloat(pointer buf, number buflen, number offset, bool isdouble)` <br>read float/double from `offset`, in C float is always 4 bytes and double is 8.
* `undefined memwritefloat(pointer buf, number buflen, number offset, bool isdouble, double val)` <br>write float/double `val` to `offset`.
* `string memreadstring(pointer buf, number buflen, number offset, number len)` <br>read `len` bytes from `offset`, returns JS string.
* `undefined memwritestring(pointer buf, number buflen, number offset, string str)` <br>write `str` to `offset`.
* `pointer tocstring(string str)` <br>wrapper of `JS_ToCString()`.
* `undefined freecstring(pointer cstr)` <br>wrapper of `JS_FreeCString()`.
* `string newstring(pointer cstr)` <br>wrapper of `JS_NewString()`. **Unsafe!**

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
* `number ffi_prep_cif(pointer cif, number abi, number nargs, pointer rtype, pointer atypes)`
* `number ffi_prep_cif_var(pointer cif, number abi, number nfixedargs, number ntotalargs, pointer rtype, pointer atypes)`
* `undefined ffi_call(pointer cif, pointer fn, pointer rvalue, pointer avalues)`
* `number ffi_get_struct_offsets(number abi, pointer struct_type, pointer offsets)`
* `number ffi_closure_alloc(number, number)`
* `undefined ffi_closure_free(number)`
* `number ffi_prep_closure_loc(number, number, number, number, number)`

And many necessary constant values or addresses such as `RTLD_XXX` `FFI_XXX` `ffi_type_xxx` are exposed.

**Cautions:**

* Since there is no way to define C numeric variables in JS, only dynamic creation using `malloc` is reasonable, so don't forget to `free` them when no longer used.
* `ffi_type_xxx` are pointers, eg. memory addresses.

Here is a simple example invoking `test1`:

    let handle = ffi.dlopen("test-lib.so", ffi.RTLD_NOW);
    let test1 = ffi.dlsym(handle, 'test1');
    let cif = ffi.malloc(ffi.sizeof_ffi_cif);
    ffi.ffi_prep_cif(cif, ffi.FFI_DEFAULT_ABI, 0, ffi.ffi_type_void, 0);
    ffi.ffi_call(cif, test1, 0, 0)
    ffi.free(cif);
    ffi.dlclose(handle);

And here is a slightly complex example invoking `test2`:

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

In libffi document there are detailed instructions on how to pass C structures. Here is how to invoke `test3`. JS code looks very similar to C, except almost all variables are dynamically created, so be very careful dealing memories and pointers.

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

## Examples

### More examples visit <https://github.com/shajunxing/quickjs-misc>

### JS version of <https://curl.se/libcurl/c/simple.html>

    import { CFunction } from 'quickjs-ffi.js'

    const LIBCURL_SO = '/usr/lib/x86_64-linux-gnu/libcurl.so.4'
    const curl_easy_init = new CFunction(LIBCURL_SO, 'curl_easy_init', null, 'pointer').invoke;
    const CURLOPT_URL = 10000 + 2;
    const CURLOPT_FOLLOWLOCATION = 0 + 52;
    const curl_easy_perform = new CFunction(LIBCURL_SO, 'curl_easy_perform', null, 'int', 'pointer').invoke;
    const CURLE_OK = 0;
    const curl_easy_strerror = new CFunction(LIBCURL_SO, 'curl_easy_strerror', null, 'string', 'int').invoke;
    const curl_easy_cleanup = new CFunction(LIBCURL_SO, 'curl_easy_cleanup', null, 'void', 'pointer').invoke;

    let curl = curl_easy_init();
    if (curl > 0) {
        let curl_easy_setopt = new CFunction(LIBCURL_SO, 'curl_easy_setopt', 2, 'int', 'pointer', 'int', 'string');
        curl_easy_setopt.invoke(curl, CURLOPT_URL, "https://example.com");
        curl_easy_setopt.free();
        curl_easy_setopt = new CFunction(LIBCURL_SO, 'curl_easy_setopt', 2, 'int', 'pointer', 'int', 'long');
        curl_easy_setopt.invoke(curl, CURLOPT_FOLLOWLOCATION, 1);
        curl_easy_setopt.free();
        let res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            console.log("curl_easy_perform() failed:", curl_easy_strerror(res));
        }
        curl_easy_cleanup(curl);
    }
