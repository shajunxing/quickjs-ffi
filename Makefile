ffi: quickjs-ffi.c test-lib.c
	gcc quickjs-ffi.c -o quickjs-ffi.so -ldl -lffi -shared -fPIC
	gcc test-lib.c -o test-lib.so -shared -fPIC
	qjs test.js

test1: test1.c
	gcc test1.c -o test1 -lffi -ldl -fPIC
	./test1

fib: fib.c
	gcc fib.c -o fib.so -shared -fPIC

null: null.c
	gcc null.c -o null1
	gcc null.c -o null2 -fPIC
