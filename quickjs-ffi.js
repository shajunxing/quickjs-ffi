import {
    malloc, free, memset, memwriteint, memwritestring, memwritefloat,
    dlopen, dlclose, dlsym, dlerror, ffi_prep_cif,
    RTLD_NOW, sizeof_ffi_cif, sizeof_uintptr_t, FFI_DEFAULT_ABI, FFI_OK, FFI_BAD_TYPEDEF, FFI_BAD_ABI,
    sizeof_ffi_type, offsetof_ffi_type_type, offsetof_ffi_type_elements, FFI_TYPE_STRUCT,
} from './quickjs-ffi.so'

export let dlcache = {}; // {'filename': {'handle': ..., 'symbols': {'...': ...}}}

export function dl_cached_open_sym(filename, symbol) {
    if (!dlcache.hasOwnProperty(filename)) {
        let h = dlopen(filename, RTLD_NOW);
        if (h === 0) {
            throw new ReferenceError(dlerror());
        }
        dlcache[filename] = {
            'handle': h,
            'symbols': {}
        }
    }

    if (!dlcache[filename]['symbols'].hasOwnProperty(symbol)) {
        let p = dlsym(dlcache[filename]['handle'], symbol);
        if (p === 0) {
            throw new ReferenceError(dlerror());
        }
        dlcache[filename]['symbols'][symbol] = p;
    }

    return dlcache[filename]['symbols'][symbol];
}

export function dl_cached_close(filename) {
    if (dlcache.hasOwnProperty(filename)) {
        dlclose(dlcache[filename]['handle']);
        delete dlcache[filename];
    }
}

export function malloc_cif() {
    return malloc(sizeof_ffi_cif);
}

export function ffi_malloc_prep_cif(nargs, rtype, atypes) {
    let cif = malloc_cif();
    let status = ffi_prep_cif(cif, FFI_DEFAULT_ABI, nargs, rtype, atypes);
    if (status != FFI_OK) {
        free(cif);
        throw new TypeError({
            FFI_BAD_TYPEDEF: 'FFI_BAD_TYPEDEF',
            FFI_BAD_ABI: 'FFI_BAD_ABI'
        }[status]);
    }
    return cif;
}

export function malloc_uintptr_array(...addrs) {
    let arr_size = sizeof_uintptr_t * addrs.length;
    let arr = malloc(arr_size);
    for (let i = 0; i < addrs.length; i++) {
        memwriteint(arr, arr_size, sizeof_uintptr_t * i, sizeof_uintptr_t, addrs[i]);
    }
    return arr;
}

export function malloc_string(buflen, str) {
    let buf = malloc(buflen);
    memset(buf, 0, buflen);
    memwritestring(buf, buflen, 0, str);
    return buf;
}

export function malloc_int(bytewidth, val) {
    let buf = malloc(bytewidth);
    memwriteint(buf, bytewidth, 0, bytewidth, val);
    return buf;
}

export function malloc_uintptr(addr) {
    return malloc_int(sizeof_uintptr_t, addr);
}

export function malloc_float(val) {
    let buf = malloc(4);
    memwritefloat(buf, 4, 0, false, val);
    return buf;
}

export function malloc_double(val) {
    let buf = malloc(8);
    memwritefloat(buf, 8, 0, true, val);
    return buf;
}

export function malloc_ffi_type_struct(addr) {
    let buf = malloc(sizeof_ffi_type);
    memset(buf, 0, sizeof_ffi_type);
    memwriteint(buf, sizeof_ffi_type, offsetof_ffi_type_type, 2, FFI_TYPE_STRUCT);
    memwriteint(buf, sizeof_ffi_type, offsetof_ffi_type_elements, sizeof_uintptr_t, addr);
    return buf;
}
