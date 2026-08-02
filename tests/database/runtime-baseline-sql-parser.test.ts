import { test } from 'node:test';
import assert from 'node:assert';
import { PostgresSqlParser, LexerState } from './helpers/runtime-baseline-sql-parser';

test("1. prosta tabela i dwie kolumny", () => {
  const sql = `CREATE TABLE users ( id integer, name text );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 1);
  assert.strictEqual(tables[0].tableName, 'users');
  assert.strictEqual(tables[0].columns.length, 2);
  assert.strictEqual(tables[0].columns[0].columnName, 'id');
  assert.strictEqual(tables[0].columns[1].columnName, 'name');
});

test("2. kilka CREATE TABLE w jednym pliku", () => {
  const sql = `CREATE TABLE t1 (id int); CREATE TABLE t2 (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 2);
  assert.strictEqual(tables[0].tableName, 't1');
  assert.strictEqual(tables[1].tableName, 't2');
});

test("3. CREATE TABLE IF NOT EXISTS", () => {
  const sql = `CREATE TABLE IF NOT EXISTS t1 (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 1);
  assert.strictEqual(tables[0].tableName, 't1');
});

test("4. schema-qualified table name", () => {
  const sql = `CREATE TABLE public.t1 (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 1);
  assert.strictEqual(tables[0].tableName, 't1'); // Or public.t1 if you preserved it. Currently we just grab t1.
});

test("5. quoted schema i quoted table", () => {
  const sql = `CREATE TABLE "public"."t1" (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 1);
  assert.strictEqual(tables[0].tableName, 't1');
});

test("6. numeric(10, 2)", () => {
  const sql = `CREATE TABLE t1 (val numeric(10, 2));`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].type, "numeric(10, 2)");
});

test("7. timestamp(6) with time zone", () => {
  const sql = `CREATE TABLE t1 (val timestamp(6) with time zone);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].type, "timestamp(6) with time zone");
});

test("8. DEFAULT concat('a,b', name)", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT concat('a,b', name));`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "concat('a,b', name)");
});

test("9. DEFAULT ARRAY['a', 'b']", () => {
  const sql = `CREATE TABLE t1 (val text[] DEFAULT ARRAY['a', 'b']);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "ARRAY['a', 'b']");
});

test("10. DEFAULT jsonb_build_object('a', 1, 'b', 2)", () => {
  const sql = `CREATE TABLE t1 (val jsonb DEFAULT jsonb_build_object('a', 1, 'b', 2));`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "jsonb_build_object('a', 1, 'b', 2)");
});

test("11. CHECK (value IN ('a', 'b'))", () => {
  const sql = `CREATE TABLE t1 (val text CHECK (value IN ('a', 'b')));`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("12. table-level PRIMARY KEY", () => {
  const sql = `CREATE TABLE t1 (
    id int,
    PRIMARY KEY (id)
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("13. named table-level CONSTRAINT", () => {
  const sql = `CREATE TABLE t1 (
    id int,
    CONSTRAINT pk_t1 PRIMARY KEY (id)
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("14. table-level FOREIGN KEY", () => {
  const sql = `CREATE TABLE t1 (
    id int,
    FOREIGN KEY (id) REFERENCES t2(id)
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("15. table-level UNIQUE", () => {
  const sql = `CREATE TABLE t1 (
    id int,
    UNIQUE (id)
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("16. table-level CHECK", () => {
  const sql = `CREATE TABLE t1 (
    id int,
    CHECK (id > 0)
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("17. inline PRIMARY KEY", () => {
  const sql = `CREATE TABLE t1 (id int PRIMARY KEY);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].columnName, 'id');
});

test("18. inline UNIQUE", () => {
  const sql = `CREATE TABLE t1 (id int UNIQUE);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].columnName, 'id');
});

test("19. inline REFERENCES", () => {
  const sql = `CREATE TABLE t1 (id int REFERENCES t2(id));`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].columnName, 'id');
});

test("20. line comment z przecinkiem", () => {
  const sql = `CREATE TABLE t1 (
    id int -- this is a comment, with comma
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("21. line comment z nawiasami", () => {
  const sql = `CREATE TABLE t1 (
    id int -- this is a comment (with parens)
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("22. block comment z przecinkiem", () => {
  const sql = `CREATE TABLE t1 (
    id int /* comment, with comma */
  );`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("23. block comment z CREATE TABLE", () => {
  const sql = `/* CREATE TABLE t0 (); */ CREATE TABLE t1 (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 1);
  assert.strictEqual(tables[0].tableName, 't1');
});

test("24. string zawierający --", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT 'abc -- def');`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "'abc -- def'");
});

test("25. string zawierający /* */", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT 'abc /* def */');`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "'abc /* def */'");
});

test("26. escaped single quote", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT 'it''s valid');`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "'it''s valid'");
});

test("27. quoted identifier ze spacją", () => {
  const sql = `CREATE TABLE "my table" (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].tableName, 'my table');
});

test("28. escaped double quote w identyfikatorze", () => {
  const sql = `CREATE TABLE "my "" table" (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].tableName, 'my " table');
});

test("29. $$ dollar, quoted $$", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT $$ dollar, quoted $$);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "$$ dollar, quoted $$");
});

test("30. $tag$ value, with comma $tag$", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT $tag$ value, with comma $tag$);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "$tag$ value, with comma $tag$");
});

test("31. dollar quote zawierający nawiasy", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT $tag$ ( value ) $tag$);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "$tag$ ( value ) $tag$");
});

test("32. dollar quote zawierający CREATE TABLE", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT $tag$ CREATE TABLE t0 (); $tag$);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 1);
});

test("33. średnik wewnątrz stringa", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT 'a;'); CREATE TABLE t2 (id int);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables.length, 2);
  assert.strictEqual(tables[0].columns[0].defaultExpression, "'a;'");
});

test("34. przecinek wewnątrz zagnieżdżonej funkcji", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT coalesce(nullif('a', 'b'), 'c'));`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, "coalesce(nullif('a', 'b'), 'c')");
});

test("35. NOT NULL wewnątrz stringa", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT 'NOT NULL');`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].nullable, true);
});

test("36. DEFAULT wewnątrz komentarza", () => {
  const sql = `CREATE TABLE t1 (val text /* DEFAULT 'x' */);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns[0].defaultExpression, null);
});

test("37. nawias w komentarzu", () => {
  const sql = `CREATE TABLE t1 (val text /* ) */);`;
  const parser = new PostgresSqlParser(sql);
  const tables = parser.parse();
  assert.strictEqual(tables[0].columns.length, 1);
});

test("38. niezamknięty string — jawny parse error", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT 'abc );`;
  const parser = new PostgresSqlParser(sql);
  assert.throws(() => parser.parse(), /Unterminated lexical state/);
});

test("39. niezamknięty block comment — jawny parse error", () => {
  const sql = `CREATE TABLE t1 (val text /* abc );`;
  const parser = new PostgresSqlParser(sql);
  assert.throws(() => parser.parse(), /Unterminated lexical state/);
});

test("40. niezamknięty dollar quote — jawny parse error", () => {
  const sql = `CREATE TABLE t1 (val text DEFAULT $$ abc );`;
  const parser = new PostgresSqlParser(sql);
  assert.throws(() => parser.parse(), /Unterminated lexical state/);
});
