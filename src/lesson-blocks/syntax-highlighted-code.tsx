import { Highlight, themes } from "prism-react-renderer";
import Prism from "prismjs";
import type { Language } from "../lib/types";
import { CodeFrame, normalizedCodeLanguage } from "./code-frame";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";

export { normalizedCodeLanguage } from "./code-frame";

export function SyntaxHighlightedCode({ code, language, interfaceLanguage = "en" }: { code: string; language?: string; interfaceLanguage?: Language }) {
  const normalizedLanguage = normalizedCodeLanguage(language);
  return <CodeFrame code={code} language={language} interfaceLanguage={interfaceLanguage}>{normalizedLanguage && (
    <Highlight prism={Prism} theme={themes.nightOwl} code={code} language={normalizedLanguage}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <code className="block min-w-max">
          {tokens.map((line, lineIndex) => (
            <span key={lineIndex} {...getLineProps({ line })}>
              {line.map((token, tokenIndex) => <span key={tokenIndex} {...getTokenProps({ token })} />)}
              {"\n"}
            </span>
          ))}
        </code>
      )}
    </Highlight>
  )}</CodeFrame>;
}
