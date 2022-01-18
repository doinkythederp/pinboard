import { inspect } from 'util';
import * as kleur from 'kleur/colors';

type Formats = Exclude<keyof typeof kleur, '$'>;
type Formatter<Used extends Formats = never> = Omit<
  {
    [Format in Formats]: Formatter<Used | Format>;
  },
  Used
> &
  ((input: string) => string) &
  ((strings: TemplateStringsArray, ...subs: unknown[]) => string);

function createBuilder<UsedFormats extends Formats = never>(
  used: UsedFormats[]
): Formatter<UsedFormats> {
  return new Proxy(
    (input: string | TemplateStringsArray, ...subs: unknown[]): string => {
      const parts: unknown[] = [];
      if (typeof input === 'string') {
        // normal call
        parts.push(input);
      } else {
        // tagged template call
        for (let i = 0; i < input.length; i++) {
          parts.push(input[i]!);
          if (i in subs) parts.push(subs[i]);
        }
      }

      let formattedInput = parts
        .map((part) =>
          typeof part === 'string'
            ? part
            : inspect(part, {
                colors: true
              })
        )
        .join('');

      for (const format of used) {
        formattedInput = kleur[format](formattedInput);
      }

      return formattedInput;
    },
    {
      get(target, propertyKey, receiver) {
        if (propertyKey in target)
          return Reflect.get(target, propertyKey, receiver) as unknown;
        if (propertyKey in kleur)
          return createBuilder([...used, propertyKey] as Formats[]);
      }
    }
  ) as Formatter<UsedFormats>;
}

const format = createBuilder([]);
export default format;
