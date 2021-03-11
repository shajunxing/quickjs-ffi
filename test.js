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