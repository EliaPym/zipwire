import { expect, test } from "vitest";
import { parseClientMessage } from "../../shared/protocol.ts";

const longId = "a".repeat(64);
const tooLongId = "a".repeat(65);

test.each([
   // JSON Parsing tests
   { name: "Not JSON - String", input: "ThisIsNotJSON", expected: null },
   { name: "Not JSON - Number", input: "42", expected: null },
   { name: "Not JSON - Null", input: "null", expected: null },
   { name: "Not JSON - Array", input: "[]", expected: null },
   { name: "Not JSON - Empty Object", input: "{}", expected: null },
   { name: "Not JSON - Bad JSON", input: '{"t":"create","room":"abc123xyz"', expected: null },

   // Valid message tests
   {
      name: "Valid - Create",
      input: '{"t":"create","room":"abc123xyz"}',
      expected: { t: "create", room: "abc123xyz" }
   },
   {
      name: "Valid - Join",
      input: '{"t":"join","room":"abc123xyz"}',
      expected: { t: "join", room: "abc123xyz" }
   },
   {
      name: "Valid - Signal",
      input: '{"t":"signal","data":"HelloWorld"}',
      expected: { t: "signal", data: "HelloWorld" }
   },

   // Unknown type tests
   {
      name: "Unknown Type - Different Type",
      input: '{"t":"wrongtype","room":"abc123xyz"}',
      expected: null
   },
   { name: "Unknown Type - Capslock", input: '{"t":"JOIN","room":"abc123xyz"}', expected: null },

   // Bad/Missing field tests
   { name: "Bad/Missing Field - No Room", input: '{"t":"join"}', expected: null },
   {
      name: "Bad/Missing Field - Room Number",
      input: '{"t":"join","room":1234567890}',
      expected: null
   },
   {
      name: "Bad/Missing Field - Room Spaces",
      input: '{"t":"join","room":"abc 123 xyz"}',
      expected: null
   },
   {
      name: "Bad/Missing Field - Room Validation",
      input: '{"t":"join","room":"abc/123.xyz"}',
      expected: null
   },
   { name: "Bad/Missing Field - No Data", input: '{"t":"signal"}', expected: null },
   {
      name: "Bad/Missing Field - Data is Object",
      input: '{"t":"signal","data":{"kind":"offer"}}',
      expected: null
   },

   // Room ID length tests
   { name: "Room ID Length - Too Short", input: '{"t":"join","room":"abc123x"}', expected: null },
   {
      name: "Room ID Length - Short Edge Case",
      input: '{"t":"join","room":"abc123xy"}',
      expected: { t: "join", room: "abc123xy" }
   },
   {
      name: "Room ID Length - Long Edge Case",
      input: `{"t":"join","room":"${longId}"}`,
      expected: { t: "join", room: longId }
   },
   {
      name: "Room ID Length - Too Long",
      input: `{"t":"join","room":"${tooLongId}"}`,
      expected: null
   },

   // Extra fields - will be valid
   {
      name: "Extra Fields - Admin",
      input: '{"t":"create","room":"abc123xyz","admin":true}',
      expected: { t: "create", room: "abc123xyz" }
   },
   {
      name: "Extra Fields - Room and Data",
      input: '{"t":"signal","room":"abc123xyz","data":"HelloWorld"}',
      expected: { t: "signal", data: "HelloWorld" }
   },
   {
      name: "Extra Fields - Proto",
      input: '{"t":"create","room":"abc123xyz","__proto__":{"admin":true}}',
      expected: { t: "create", room: "abc123xyz" }
   }
])("$name", ({ input, expected }) => {
   expect(parseClientMessage(input)).toEqual(expected);
});
