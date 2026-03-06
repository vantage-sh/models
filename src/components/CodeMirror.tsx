import React from "react";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { sql, SQLite } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";

type CodeMirrorProps = {
    value: string;
    maxHeight: string;
    onChange: (value: string) => void;
};

export default function CodeMirror(props: CodeMirrorProps) {
    const editor = React.useRef<HTMLDivElement>(null);
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches ?? false);
    }, []);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    React.useEffect(() => {
        if (editor.current) {
            const extensions = [
                basicSetup,
                sql({
                    dialect: SQLite,
                }),
            ];

            if (isDark) {
                extensions.push(oneDark);
            }

            const view = new EditorView({
                doc: props.value,
                extensions,
                parent: editor.current,
                dispatchTransactions: (trs) => {
                    view.update(trs);
                    for (const tr of trs) {
                        if (tr.docChanged) {
                            props.onChange(view.state.doc.toString());
                        }
                    }
                },
            });

            return () => {
                view.destroy();
            };
        }
    }, [editor, isDark]);

    return <div style={{ maxHeight: props.maxHeight }} ref={editor}></div>;
}
