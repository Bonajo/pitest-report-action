package com.example;
// Mutated lines match the line numbers in statuses.xml and statuses.csv
public class Loop {
    public void run(int times) {
        for (int i = 0; i < times; i++) allocate(i);
    }
    public int[] allocate(int size) {
        return new int[size];
    }

    public Object crash() {
        return new Object();
    }
    public void invalid() { run(0); }
}
