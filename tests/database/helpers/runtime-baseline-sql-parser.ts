export enum LexerState {
  NORMAL = 'NORMAL',
  SINGLE_QUOTED_STRING = 'SINGLE_QUOTED_STRING',
  DOUBLE_QUOTED_IDENTIFIER = 'DOUBLE_QUOTED_IDENTIFIER',
  LINE_COMMENT = 'LINE_COMMENT',
  BLOCK_COMMENT = 'BLOCK_COMMENT',
  DOLLAR_QUOTED_STRING = 'DOLLAR_QUOTED_STRING'
}

export interface ColumnDefinition {
  tableName: string;
  ordinalPosition: number;
  columnName: string;
  type: string;
  nullable: boolean;
  defaultExpression: string | null;
}

export interface TableDefinition {
  tableName: string;
  columns: ColumnDefinition[];
}

interface Token {
  type: 'IDENTIFIER' | 'QUOTED_IDENTIFIER' | 'STRING' | 'SYMBOL' | 'KEYWORD' | 'WHITESPACE';
  value: string;
  upperValue: string;
  raw: string;
}

export class PostgresSqlParser {
  private sql: string;
  private pos: number = 0;
  private line: number = 1;
  private state: LexerState = LexerState.NORMAL;
  private parenDepth: number = 0;
  private blockCommentDepth: number = 0;
  private dollarTag: string = '';

  constructor(sql: string) {
    this.sql = sql;
  }

  public parse(): TableDefinition[] {
    const tables: TableDefinition[] = [];

    this.pos = 0;
    this.line = 1;
    this.state = LexerState.NORMAL;
    this.parenDepth = 0;
    this.blockCommentDepth = 0;
    this.dollarTag = '';

    while (this.pos < this.sql.length) {
      const { chunk, isEndOfStatement } = this.consumeUntilNextStatementOrEnd();
      if (chunk.trim()) {
        const tableDef = this.parseStatement(chunk.trim());
        if (tableDef) {
          tables.push(tableDef);
        }
      }
    }

    if (this.state !== LexerState.NORMAL) {
       throw new Error(`Unterminated lexical state: ${this.state} at end of input`);
    }

    return tables;
  }

  private consumeUntilNextStatementOrEnd(): { chunk: string, isEndOfStatement: boolean } {
    let chunk = '';

    while (this.pos < this.sql.length) {
      const char = this.sql[this.pos];
      const nextChar = this.pos + 1 < this.sql.length ? this.sql[this.pos + 1] : '';

      if (this.state === LexerState.NORMAL) {
        if (char === '-' && nextChar === '-') {
          this.state = LexerState.LINE_COMMENT;
          chunk += char + nextChar;
          this.pos++;
        } else if (char === '/' && nextChar === '*') {
          this.state = LexerState.BLOCK_COMMENT;
          this.blockCommentDepth = 1;
          chunk += char + nextChar;
          this.pos++;
        } else if (char === '\'') {
          this.state = LexerState.SINGLE_QUOTED_STRING;
          chunk += char;
        } else if (char === '"') {
          this.state = LexerState.DOUBLE_QUOTED_IDENTIFIER;
          chunk += char;
        } else if (char === '$') {
          const tagMatch = this.sql.substring(this.pos).match(/^\$([a-zA-Z0-9_]*)\$/);
          if (tagMatch) {
            this.state = LexerState.DOLLAR_QUOTED_STRING;
            this.dollarTag = tagMatch[0];
            chunk += this.dollarTag;
            this.pos += this.dollarTag.length - 1;
          } else {
            chunk += char;
          }
        } else if (char === '(') {
          this.parenDepth++;
          chunk += char;
        } else if (char === ')') {
          this.parenDepth--;
          chunk += char;
        } else if (char === ';' && this.parenDepth === 0) {
          chunk += char;
          this.pos++;
          return { chunk, isEndOfStatement: true };
        } else {
          chunk += char;
          if (char === '\n') this.line++;
        }
      } else if (this.state === LexerState.SINGLE_QUOTED_STRING) {
        chunk += char;
        if (char === '\'') {
          if (nextChar === '\'') {
            chunk += nextChar;
            this.pos++;
          } else {
            this.state = LexerState.NORMAL;
          }
        }
      } else if (this.state === LexerState.DOUBLE_QUOTED_IDENTIFIER) {
        chunk += char;
        if (char === '"') {
          if (nextChar === '"') {
            chunk += nextChar;
            this.pos++;
          } else {
            this.state = LexerState.NORMAL;
          }
        }
      } else if (this.state === LexerState.LINE_COMMENT) {
        chunk += char;
        if (char === '\n') {
          this.state = LexerState.NORMAL;
          this.line++;
        }
      } else if (this.state === LexerState.BLOCK_COMMENT) {
        chunk += char;
        if (char === '/' && nextChar === '*') {
          this.blockCommentDepth++;
          chunk += nextChar;
          this.pos++;
        } else if (char === '*' && nextChar === '/') {
          this.blockCommentDepth--;
          chunk += nextChar;
          this.pos++;
          if (this.blockCommentDepth === 0) {
            this.state = LexerState.NORMAL;
          }
        } else if (char === '\n') {
          this.line++;
        }
      } else if (this.state === LexerState.DOLLAR_QUOTED_STRING) {
        chunk += char;
        if (char === '$') {
          if (this.sql.substring(this.pos).startsWith(this.dollarTag)) {
            chunk += this.dollarTag.substring(1);
            this.pos += this.dollarTag.length - 1;
            this.state = LexerState.NORMAL;
          }
        }
        if (char === '\n') this.line++;
      }

      this.pos++;
    }

    return { chunk, isEndOfStatement: false };
  }

  private parseStatement(stmt: string): TableDefinition | null {
    const tokens = this.tokenizeStatement(stmt);
    const filteredTokens = tokens.filter(t => t.type !== 'WHITESPACE');
    if (filteredTokens.length < 3) return null;

    if (filteredTokens[0].upperValue === 'CREATE' && filteredTokens[1].upperValue === 'TABLE') {
      let fIdx = 2;
      if (filteredTokens[fIdx]?.upperValue === 'IF') {
        if (filteredTokens[fIdx+1]?.upperValue === 'NOT' && filteredTokens[fIdx+2]?.upperValue === 'EXISTS') {
          fIdx += 3;
        }
      }

      if (fIdx >= filteredTokens.length) return null;

      let tableName = '';
      if (filteredTokens[fIdx].type === 'IDENTIFIER' || filteredTokens[fIdx].type === 'QUOTED_IDENTIFIER') {
        tableName = filteredTokens[fIdx].value;
        fIdx++;
        if (fIdx < filteredTokens.length && filteredTokens[fIdx].raw === '.') {
           fIdx++;
           tableName = filteredTokens[fIdx].value;
           fIdx++;
        }
      } else {
        return null;
      }

      if (fIdx >= filteredTokens.length || filteredTokens[fIdx].raw !== '(') return null;

      const idx = tokens.indexOf(filteredTokens[fIdx]) + 1;

      let endIdx = idx;
      let openParenDepth = 1;
      while (endIdx < tokens.length && openParenDepth > 0) {
         if (tokens[endIdx].type === 'SYMBOL' && tokens[endIdx].raw === '(') openParenDepth++;
         else if (tokens[endIdx].type === 'SYMBOL' && tokens[endIdx].raw === ')') openParenDepth--;
         endIdx++;
      }
      const listTokens = tokens.slice(idx, endIdx - 1);
      const itemsTokens: Token[][] = [];
      let currentItem: Token[] = [];
      let currentDepth = 0;

      for (const t of listTokens) {
         if (t.type === 'SYMBOL' && (t.raw === '(' || t.raw === '[')) currentDepth++;
         else if (t.type === 'SYMBOL' && (t.raw === ')' || t.raw === ']')) currentDepth--;

         if (t.type === 'SYMBOL' && t.raw === ',' && currentDepth === 0) {
            itemsTokens.push(currentItem);
            currentItem = [];
         } else {
            currentItem.push(t);
         }
      }
      if (currentItem.length > 0) itemsTokens.push(currentItem);

      const columns: ColumnDefinition[] = [];
      let ordinalPosition = 1;

      for (const item of itemsTokens) {
        if (item.filter(t => t.type !== 'WHITESPACE').length === 0) continue;

        const filtered = item.filter(t => t.type !== 'WHITESPACE');
        const first = filtered[0];
        const isConstraint = ['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'EXCLUDE', 'LIKE'].includes(first.upperValue);

        if (!isConstraint) {
           const columnName = first.value;

           const typeTokens = [];
           const constraintKeywords = ['COLLATE', 'CONSTRAINT', 'NOT', 'NULL', 'DEFAULT', 'GENERATED', 'IDENTITY', 'PRIMARY', 'UNIQUE', 'REFERENCES', 'CHECK'];

           let fIdx = 1;
           while (fIdx < filtered.length) {
               const t = filtered[fIdx];
               if (t.type === 'IDENTIFIER' || t.type === 'KEYWORD') {
                  if (constraintKeywords.includes(t.upperValue)) break;
               }
               typeTokens.push(t);
               fIdx++;
           }

           let typeStr = '';
           if (typeTokens.length > 0) {
               const startOrig = item.indexOf(typeTokens[0]);
               const endOrig = item.indexOf(typeTokens[typeTokens.length - 1]);
               typeStr = item.slice(startOrig, endOrig + 1).map(t => t.raw).join('').trim();
               // old baseline compatibility: only normalize double spacing
               typeStr = typeStr.replace(/\s+/g, ' ');
           }

           let nullable = true;
           for (let j = 0; j < filtered.length; j++) {
              if (filtered[j].upperValue === 'NOT' && filtered[j+1]?.upperValue === 'NULL') {
                 nullable = false;
              } else if (filtered[j].upperValue === 'PRIMARY' && filtered[j+1]?.upperValue === 'KEY') {
                 nullable = false;
              }
           }
           let defaultExpression: string | null = null;

           while (fIdx < filtered.length) {
               const t = filtered[fIdx];
               if (t.upperValue === 'NOT') {
                   if (fIdx + 1 < filtered.length && filtered[fIdx+1].upperValue === 'NULL') {
                       fIdx += 2;
                       continue;
                   }
               } else if (t.upperValue === 'DEFAULT') {
                   fIdx++;
                   const defTokens = [];
                   let defDepth = 0;
                   while (fIdx < filtered.length) {
                       const dt = filtered[fIdx];
                       if (dt.type === 'SYMBOL' && (dt.raw === '(' || dt.raw === '[')) defDepth++;
                       else if (dt.type === 'SYMBOL' && (dt.raw === ')' || dt.raw === ']')) defDepth--;

                       if (defDepth === 0 && (dt.type === 'IDENTIFIER' || dt.type === 'KEYWORD')) {
                           if (constraintKeywords.includes(dt.upperValue)) break;
                       }
                       defTokens.push(dt);
                       fIdx++;
                   }

                   if (defTokens.length > 0) {
                       const startOrig = item.indexOf(defTokens[0]);
                       const endOrig = item.indexOf(defTokens[defTokens.length - 1]);
                       defaultExpression = item.slice(startOrig, endOrig + 1).map(t => t.raw).join('').trim();
                       // old baseline compatibility: only remove cast and double spacing if not in string
                       defaultExpression = defaultExpression.replace(/'\s*::/g, "'::");
                   }
                   continue;
               }
               fIdx++;
           }

           columns.push({
             tableName,
             ordinalPosition: ordinalPosition++,
             columnName,
             type: typeStr.trim(),
             nullable,
             defaultExpression
           });
        }
      }

      return {
        tableName,
        columns
      };
    }

    return null;
  }

  private tokenizeStatement(stmt: string): Token[] {
     const tokens: Token[] = [];
     let i = 0;
     let state = LexerState.NORMAL;
     let blockCommentDepth = 0;
     let dollarTag = '';

     while (i < stmt.length) {
       const char = stmt[i];
       const nextChar = i + 1 < stmt.length ? stmt[i + 1] : '';

       if (state === LexerState.NORMAL) {
         if (/\s/.test(char)) {
            let val = '';
            while (i < stmt.length && /\s/.test(stmt[i])) {
               val += stmt[i];
               i++;
            }
            tokens.push({ type: 'WHITESPACE', value: val, upperValue: val, raw: val });
            continue;
         } else if (char === '-' && nextChar === '-') {
            state = LexerState.LINE_COMMENT;
            i += 2;
         } else if (char === '/' && nextChar === '*') {
            state = LexerState.BLOCK_COMMENT;
            blockCommentDepth = 1;
            i += 2;
         } else if (char === '\'') {
            let val = '';
            let raw = '\'';
            i++;
            while (i < stmt.length) {
               if (stmt[i] === '\'') {
                  if (i + 1 < stmt.length && stmt[i+1] === '\'') {
                     val += '\'';
                     raw += '\'\'';
                     i += 2;
                  } else {
                     raw += '\'';
                     i++;
                     break;
                  }
               } else {
                  val += stmt[i];
                  raw += stmt[i];
                  i++;
               }
            }
            tokens.push({ type: 'STRING', value: val, upperValue: val.toUpperCase(), raw });
         } else if (char === '"') {
            let val = '';
            let raw = '"';
            i++;
            while (i < stmt.length) {
               if (stmt[i] === '"') {
                  if (i + 1 < stmt.length && stmt[i+1] === '"') {
                     val += '"';
                     raw += '""';
                     i += 2;
                  } else {
                     raw += '"';
                     i++;
                     break;
                  }
               } else {
                  val += stmt[i];
                  raw += stmt[i];
                  i++;
               }
            }
            tokens.push({ type: 'QUOTED_IDENTIFIER', value: val, upperValue: val.toUpperCase(), raw });
         } else if (char === '$') {
            const tagMatch = stmt.substring(i).match(/^\$([a-zA-Z0-9_]*)\$/);
            if (tagMatch) {
               dollarTag = tagMatch[0];
               let val = '';
               let raw = dollarTag;
               i += dollarTag.length;
               while (i < stmt.length) {
                  if (stmt.substring(i).startsWith(dollarTag)) {
                     raw += dollarTag;
                     i += dollarTag.length;
                     break;
                  } else {
                     val += stmt[i];
                     raw += stmt[i];
                     i++;
                  }
               }
               tokens.push({ type: 'STRING', value: val, upperValue: val.toUpperCase(), raw });
            } else {
               tokens.push({ type: 'SYMBOL', value: char, upperValue: char, raw: char });
               i++;
            }
         } else if (/[\[\](),;.]/.test(char)) {
            tokens.push({ type: 'SYMBOL', value: char, upperValue: char, raw: char });
            i++;
         } else if (/^[a-zA-Z0-9_$]/.test(char)) {
            let val = '';
            while (i < stmt.length && /^[a-zA-Z0-9_$]/.test(stmt[i])) {
               val += stmt[i];
               i++;
            }
            const upper = val.toUpperCase();
            const isKeyword = ['CREATE', 'TABLE', 'IF', 'NOT', 'EXISTS', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'UNIQUE', 'CHECK', 'EXCLUDE', 'LIKE', 'NULL', 'DEFAULT', 'GENERATED', 'IDENTITY', 'REFERENCES', 'COLLATE', 'ARRAY'].includes(upper);
            tokens.push({ type: isKeyword ? 'KEYWORD' : 'IDENTIFIER', value: val, upperValue: upper, raw: val });
         } else {
            tokens.push({ type: 'SYMBOL', value: char, upperValue: char, raw: char });
            i++;
         }
       } else if (state === LexerState.LINE_COMMENT) {
         if (char === '\n') {
            state = LexerState.NORMAL;
         }
         i++;
       } else if (state === LexerState.BLOCK_COMMENT) {
         if (char === '/' && nextChar === '*') {
            blockCommentDepth++;
            i += 2;
         } else if (char === '*' && nextChar === '/') {
            blockCommentDepth--;
            i += 2;
            if (blockCommentDepth === 0) {
               state = LexerState.NORMAL;
            }
         } else {
            i++;
         }
       }
     }

     return tokens;
  }
}
