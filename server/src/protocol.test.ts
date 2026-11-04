import { expect, test } from "vitest";
import { parseClientMessage } from "../../shared/protocol.ts";

// JSON Parsing tests - ignore TS errors, tests will still pass

test("Not JSON - String", () => {
  expect(parseClientMessage("ThisIsNotJSON")).toBe(null);
});

test("Not JSON - Number", () => {
  expect(parseClientMessage(42)).toBeNull();
});

test("Not JSON - Null", () => {
  expect(parseClientMessage(null)).toBeNull();
});

test("Not JSON - Array", () => {
  expect(parseClientMessage([])).toBeNull();
});

test("Not JSON - Empty Object", () => {
  expect(parseClientMessage({})).toBeNull();
});

test("Not JSON - Bad JSON", () => {
  expect(parseClientMessage('{"t":"create","room":"abc123xyz"')).toBeNull();
});

// Valid message tests

test("Valid - Create", () => {
  expect(parseClientMessage('{"t":"create","room":"abc123xyz"}')).toEqual({
    t: "create",
    room: "abc123xyz",
  });
});

test("Valid - Join", () => {
  expect(parseClientMessage('{"t":"join","room":"abc123xyz"}')).toEqual({
    t: "join",
    room: "abc123xyz",
  });
});

test("Valid - Signal", () => {
  expect(parseClientMessage('{"t":"signal","data":"HelloWorld"}')).toEqual({
    t: "signal",
    data: "HelloWorld",
  });
});

// Unknown type tests

test("Unknown Type - Different Type", () => {
  expect(parseClientMessage('{"t":"wrongtype","room":"abc123xyz"}')).toBeNull();
});

test("Unknown Type - Capslock", () => {
  expect(parseClientMessage('{"t":"JOIN","room":"abc123xyz"}')).toBeNull();
});

// Bad/Missing field tests

test("Bad/Missing Field - No Room", () => {
  expect(parseClientMessage('{"t":"join"}')).toBeNull();
});

test("Bad/Missing Field - Room Number", () => {
  expect(parseClientMessage('{"t":"join","room":1234567890}')).toBeNull();
});

test("Bad/Missing Field - Room Spaces", () => {
  expect(parseClientMessage('{"t":"join","room":abc 123 xyz}')).toBeNull();
});

test("Bad/Missing Field - Room Validation", () => {
  expect(parseClientMessage('{"t":"join","room":"abc/123.xyz"}')).toBeNull();
});

test("Bad/Missing Field - No Data", () => {
  expect(parseClientMessage('{"t":"signal"}')).toBeNull();
});

test("Bad/Missing Field - Data is Object", () => {
  expect(parseClientMessage('{"t":"signal","data":{"kind":"offer"}}')).toBeNull();
});

// Room ID length tests

test("Room ID Length - Too Short", () => {
  expect(parseClientMessage('{"t":"join","room":"abc123x"}')).toBeNull();
});

test("Room ID Length - Short Edge Case", () => {
  expect(parseClientMessage('{"t":"join","room":"abc123xy"}')).toEqual({
    t: "join",
    room: "abc123xy",
  });
});

test("Room ID Length - Long Edge Case", () => {
  let id: string = "a".repeat(64);
  expect(parseClientMessage(`{"t":"join","room":"${id}"}`)).toEqual({
    t: "join",
    room: id,
  });
});

test("Room ID Length - Too Long", () => {
  let id: string = "a".repeat(65);
  expect(parseClientMessage(`{"t":"join","room":"${id}"}`)).toBeNull();
});

// Extra fields - will be valid

test("Extra Fields - Admin", () => {
  expect(
    parseClientMessage('{"t":"create","room":"abc123xyz","admin":true}'),
  ).toEqual({
    t: "create",
    room: "abc123xyz",
  });
});

test("Extra Fields - Room and Data", () => {
  expect(
    parseClientMessage('{"t":"signal","room":"abc123xyz","data":"HelloWorld"}'),
  ).toEqual({
    t: "signal",
    data: "HelloWorld",
  });
});

test("Extra Fields - Proto", () => {
  expect(
    parseClientMessage(
      '{"t":"create","room":"abc123xyz","__proto__":{"admin":true}}',
    ),
  ).toEqual({
    t: "create",
    room: "abc123xyz",
  });
});
