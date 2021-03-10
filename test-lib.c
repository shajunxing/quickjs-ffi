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

int main() {
    s2 s = {
        .l = 123456789,
        .d = 3.141592654,
        .s.i = 54321,
        .s.f = 2.718281829};
    printf("%d %d %d %d %d %d \n", sizeof(int), sizeof(float), sizeof(s1), sizeof(long), sizeof(double), sizeof(s2));
    test3(s);
}