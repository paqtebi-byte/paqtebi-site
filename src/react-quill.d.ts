declare module 'react-quill-new' {
    import React from 'react';
    export interface ReactQuillProps {
        value?: string;
        defaultValue?: string;
        readOnly?: boolean;
        theme?: string;
        modules?: any;
        formats?: string[];
        onChange?: (content: string, delta: any, source: string, editor: any) => void;
        className?: string;
        placeholder?: string;
    }
    export default class ReactQuill extends React.Component<ReactQuillProps> { }
}
