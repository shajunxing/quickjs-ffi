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
