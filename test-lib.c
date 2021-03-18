#include <stdint.h>
#include <stdio.h>

void test1() {
    printf("Hello\n");
}

double test2(float a, double b, const char *c) {
    printf("%f %f %s\n", a, b, c);
    return (double)a + b;
}

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
    printf("%ld %f %d %f\n", s.l, s.d, s.s.i, s.s.f);
}

char *test4(s2 (*fn)(float, double, const char *)) {
    puts("test4 begins");
    s2 ret = fn(3.141592654, 2.718281829, "Hi there");
    printf("callback returns %ld %f %d %f\n", ret.l, ret.d, ret.s.i, ret.s.f);
    puts("test4 ends");
    return "greetings";
}
