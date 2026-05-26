import { useEffect, useMemo, useRef } from "react";
import { basicSetup } from "codemirror";
import {
  Compartment,
  EditorState,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
} from "@codemirror/view";
import {
  StreamLanguage,
  defaultHighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

type SourceCodeEditorLanguage = "latex" | "text";

type SourceCodeEditorProps = {
  ariaLabel: string;
  className?: string;
  language: SourceCodeEditorLanguage;
  onChange: (value: string) => void;
  value: string;
};

const latexLanguage = StreamLanguage.define(stex);

export function SourceCodeEditor({
  ariaLabel,
  className = "",
  language,
  onChange,
  value,
}: SourceCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const isApplyingExternalValueRef = useRef(false);
  const languageCompartment = useMemo(() => new Compartment(), []);
  const themeCompartment = useMemo(() => new Compartment(), []);
  const attributesCompartment = useMemo(() => new Compartment(), []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || viewRef.current) {
      return;
    }

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          indentUnit.of("  "),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          languageCompartment.of(getLanguageExtensions(language)),
          themeCompartment.of(getEditorTheme(language)),
          attributesCompartment.of(getEditorAttributes(language, ariaLabel)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isApplyingExternalValueRef.current) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [attributesCompartment, languageCompartment, themeCompartment]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();

    if (currentValue !== value) {
      isApplyingExternalValueRef.current = true;
      try {
        view.dispatch({
          changes: {
            from: 0,
            insert: value,
            to: currentValue.length,
          },
        });
      } finally {
        isApplyingExternalValueRef.current = false;
      }
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    view.dispatch({
      effects: [
        languageCompartment.reconfigure(getLanguageExtensions(language)),
        themeCompartment.reconfigure(getEditorTheme(language)),
        attributesCompartment.reconfigure(
          getEditorAttributes(language, ariaLabel),
        ),
      ],
    });
  }, [
    ariaLabel,
    attributesCompartment,
    language,
    languageCompartment,
    themeCompartment,
  ]);

  return (
    <div
      className={`min-h-[28rem] overflow-hidden ${className}`}
      ref={containerRef}
    />
  );
}

function getLanguageExtensions(language: SourceCodeEditorLanguage): Extension {
  return language === "latex" ? latexLanguage : [];
}

function getEditorAttributes(
  language: SourceCodeEditorLanguage,
  ariaLabel: string,
): Extension {
  return EditorView.contentAttributes.of({
    "aria-label": ariaLabel,
    autocapitalize: "off",
    spellcheck: language === "text" ? "true" : "false",
  });
}

function getEditorTheme(language: SourceCodeEditorLanguage): Extension {
  const isLatex = language === "latex";

  return EditorView.theme(
    {
      "&": {
        backgroundColor: isLatex ? "#111114" : "#fbfaf7",
        color: isLatex ? "#f4f4f5" : "#18181b",
        fontSize: isLatex ? "12px" : "14px",
        height: "100%",
        minHeight: "28rem",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-scroller": {
        fontFamily:
          '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
        lineHeight: isLatex ? "1.58" : "1.62",
        overflow: "auto",
      },
      ".cm-content": {
        caretColor: isLatex ? "#fafafa" : "#111827",
        minHeight: "28rem",
        padding: "16px 18px",
      },
      ".cm-line": {
        padding: "0 2px",
      },
      ".cm-gutters": {
        backgroundColor: isLatex ? "#0c0c0e" : "#f1f0ec",
        borderRight: isLatex ? "1px solid #27272a" : "1px solid #dedbd2",
        color: isLatex ? "#71717a" : "#8a8275",
      },
      ".cm-activeLine": {
        backgroundColor: isLatex
          ? "rgba(255, 255, 255, 0.055)"
          : "rgba(24, 24, 27, 0.045)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isLatex
          ? "rgba(255, 255, 255, 0.075)"
          : "rgba(24, 24, 27, 0.07)",
        color: isLatex ? "#e4e4e7" : "#18181b",
      },
      ".cm-cursor": {
        borderLeftColor: isLatex ? "#fafafa" : "#111827",
      },
      ".cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: isLatex
          ? "rgba(125, 211, 252, 0.32)"
          : "rgba(24, 24, 27, 0.18)",
      },
      ".cm-matchingBracket": {
        backgroundColor: isLatex
          ? "rgba(125, 211, 252, 0.18)"
          : "rgba(14, 165, 233, 0.14)",
        outline: isLatex
          ? "1px solid rgba(125, 211, 252, 0.35)"
          : "1px solid rgba(14, 165, 233, 0.25)",
      },
      ".cm-searchMatch": {
        backgroundColor: "rgba(250, 204, 21, 0.32)",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: "rgba(251, 146, 60, 0.42)",
      },
      "@media (min-width: 1280px)": {
        "&": {
          minHeight: "calc(100dvh - 20.5rem)",
        },
        ".cm-content": {
          minHeight: "calc(100dvh - 20.5rem)",
        },
      },
    },
    {
      dark: isLatex,
    },
  );
}
