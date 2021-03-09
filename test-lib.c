#include <stdio.h>
#include <stdint.h>

void test1() {
    printf("Hello\n");
}

double test2(float a, double b, const char *c) {
    printf("%f %f %s\n", a, b, c);
    return (double)a + b;
}