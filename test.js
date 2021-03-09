import * as ffi from './quickjs-ffi.so'

// for (let k in ffi) {
//     console.log(k, '=', ffi[k].toString());
// }

// let buflen = 8;
// let buf = ffi.malloc(buflen);
// ffi.printhex(buf, buflen);
// ffi.memset(buf, 0xff, buflen);
// ffi.printhex(buf, buflen);
// console.log(
//     ffi.memreadint(buf, buflen, 0, true, 1),
//     ffi.memreadint(buf, buflen, 0, true, 2),
//     ffi.memreadint(buf, buflen, 0, true, 4),
//     ffi.memreadint(buf, buflen, 0, true, 8),
//     ffi.memreadint(buf, buflen, 0, false, 1),
//     ffi.memreadint(buf, buflen, 0, false, 2),
//     ffi.memreadint(buf, buflen, 0, false, 4),
//     ffi.memreadint(buf, buflen, 0, false, 8)
// );
// ffi.memwriteint(buf, buflen, 6, 2, 0x1234);
// ffi.printhex(buf, buflen);
// console.log(ffi.memreadint(buf, buflen, 6, false, 2).toString(16));
// ffi.memwritestring(buf, buflen, 2, "hello");
// ffi.printhex(buf, buflen);
// print(ffi.memreadstring(buf, buflen, 2, 5));
// ffi.memwritefloat(buf, buflen, 0, true, 6.66666666666666666666666666);
// ffi.printhex(buf, buflen);
// console.log(ffi.memreadfloat(buf, buflen, 0, true));
// ffi.free(buf);

// let handle = ffi.dlopen("test-lib.so", ffi.RTLD_NOW);
// console.log(handle);
// let test1 = ffi.dlsym(handle, 'test1');
// console.log(test1);
// let cif = ffi.malloc(ffi.sizeof_ffi_cif);
// console.log(ffi.ffi_prep_cif(cif, ffi.FFI_DEFAULT_ABI, 0, ffi.ffi_type_void, 0));
// ffi.ffi_call(cif, test1, 0, 0)
// ffi.free(cif);
// console.log(ffi.dlclose(handle));

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