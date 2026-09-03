import type { ForeverFileRecord, StampKind } from "@/lib/record";

export type ExampleRecord = ForeverFileRecord & {
  stamp: StampKind;
  caption: string;
  context: string;
  example: true;
};

export const DEMO_RECORD: ExampleRecord = {
  id: "7Kx9m2QpL0vN4wR8tYcB3jHfA6uZsXe1DgMkPqwXY12",
  name: "family-history.pdf",
  contentType: "application/pdf",
  size: 1_468_800,
  timestamp: Date.UTC(2026, 7, 14) / 1000,
  sha256: "3c91a0b47e2d18f6c9e4a1b8d0f27c5e6a9b1d3c4e5f60718293a4b5c6d7e8a7",
  appName: "foreverfile",
  stamp: "verified",
  caption: "Verified — unchanged since publication",
  context: "24 pages · 1.4 MB · on this device",
  example: true,
};

export const SCENARIO_RECORDS: ExampleRecord[] = [
  {
    id: "pH8wQ2nL5tR9cV3yB6jK1xM4sA7dF0gU2iE9oN8qW3z",
    name: "garden-wall-1998.jpg",
    contentType: "image/jpeg",
    size: 1_887_436,
    timestamp: Date.UTC(2026, 2, 3) / 1000,
    sha256: "a19c4e7b2f083d56c1e90ab34d78f12e6b5c0a99d4e1f2738c6b5a01d2e3f4a5",
    appName: "foreverfile",
    stamp: "unchanged",
    caption: "Original photograph, not a later edit",
    context: "Photograph kept in original form",
    example: true,
  },
  {
    id: "mN4sT8wQ1pL6vC2yH9bR3jK0xA5dF7gU2iE1oZ8qW4k",
    name: "board-minutes-2024-11-12.pdf",
    contentType: "application/pdf",
    size: 225_280,
    timestamp: Date.UTC(2024, 10, 12) / 1000,
    sha256: "b20d5f8c3e194a67d2f01bc45e89a23f7c6d1b00e5f2a3849d7c6b12e3f4a5b6",
    appName: "foreverfile",
    stamp: "verified",
    caption: "This exact version of the document",
    context: "A document with a known version",
    example: true,
  },
  {
    id: "kR7vC2nP5tL9wQ3yB6jH1xM4sA8dF0gU2iE9oN1qW5z",
    name: "north-sea-score.wav",
    contentType: "audio/wav",
    size: 50_541_363,
    timestamp: Date.UTC(2026, 5, 21) / 1000,
    sha256: "c31e6a9d4f205b78e3a12cd56f90a34a8d7e2c11f6a3a4950e8d7c23f4a5b6c7",
    appName: "foreverfile",
    stamp: "public",
    caption: "Original file, with the publication date",
    context: "A creative work with a publication date",
    example: true,
  },
  {
    id: "sA3dF6gU9iE2oN5qW8zK1xM4pL7vC0yH9bR2jT5nQ8w",
    name: "letter-elisabet-1912.pdf",
    contentType: "application/pdf",
    size: 4_299_162,
    timestamp: Date.UTC(2026, 0, 9) / 1000,
    sha256: "d42f7b0e5a316c89f4a23de67a01b45a9e8f3d22a7a4a5061f9e8d34a5b6c7d8",
    appName: "foreverfile",
    stamp: "persistent",
    caption: "Retrievable later, without the publisher",
    context: "A historical document others can retrieve later",
    example: true,
  },
];
