import {
    $getRoot,
    $insertNodes,
    ParagraphNode,
    LexicalEditor,
    LexicalNode,
    ElementNode,
    $applyNodeReplacement,
    SerializedLexicalNode,
} from "lexical";
import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { JSDOM } from "jsdom";
import { isHTMLAnchorElement } from "@lexical/utils";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";

export function htmlToNodes(htmlString: string): string {
    const editor: LexicalEditor = createHeadlessEditor({
        nodes: [
            ListNode,
            ListItemNode,
            // @ts-expect-error
            LinkNode,
            HeadingNode,
            QuoteNode,
            ParagraphNode,
            CodeNode,
            TableNode,
            TableCellNode,
            TableRowNode,
            // @ts-expect-error
            AssetNode,
        ],
    });

    editor.update(
        () => {
            const dom = new JSDOM(htmlString);
            const nodes = $generateNodesFromDOM(editor, dom.window.document);

            $getRoot().select();
            $insertNodes(nodes);
        },
        { discrete: true }
    );

    const jsonString = editor.toJSON();
    const result = JSON.stringify(jsonString.editorState);

    return result;
}

interface AssetNodeProps {
    altText?: string;
    src: string;
    height?: number;
    width?: number;
}

function $createAssetNodeFromExternalUrl({
    altText,
    src,
    height,
    width,
}: AssetNodeProps): AssetNode {
    const [id, randomId, url] = src.replace("asset:", "").split("|");

    const asset: Asset = {
        _id: randomId,
        type: "image",
        fields: {
            id: {
                type: "text",
                value: id,
            },
            url: {
                type: "text",
                value: url,
            },
        },
        _source: "uniform-assets",
    };

    if (height) {
        asset.fields["height"] = {
            type: "number",
            value: height,
        };
    }

    if (width) {
        asset.fields["width"] = {
            type: "number",
            value: width,
        };
    }

    const assetNode = new AssetNode(asset);
    return $applyNodeReplacement(assetNode);
}

function $convertImageElement(domNode: HTMLImageElement): { node: LexicalNode | null } {
    if (!domNode.src.startsWith("asset:")) {
        return { node: null };
    }

    const { alt: altText, src, style } = domNode;

    const node = $createAssetNodeFromExternalUrl({
        altText,
        src,
        height: style?.height ? parseInt(style.height) : undefined,
        width: style?.width ? parseInt(style.width) : undefined,
    });

    return { node };
}

interface Asset {
    _id: string;
    type: string;
    fields: {
        [key: string]: {
            type: string;
            value: string | number;
        };
    };
    _source: string;
}

class AssetNode extends ElementNode {
    __asset: Asset;
    __upload?: unknown;
    __error?: unknown;

    constructor(asset: Asset, upload?: unknown, error?: unknown, key?: string) {
        super(key);
        this.__asset = asset;
        this.__upload = upload;
        this.__error = error;
    }

    static getType(): string {
        return "asset";
    }

    static clone(node: AssetNode): AssetNode {
        return new AssetNode(node.__asset, node.__upload, node.__error, node.__key);
    }

    getAsset(): Asset {
        const self = this.getLatest();
        return self.__asset;
    }

    setAsset(asset: Asset): void {
        const self = this.getWritable();
        self.__asset = asset;
    }

    getUpload(): unknown | undefined {
        const self = this.getLatest();
        return self.__upload;
    }

    setUpload(upload: unknown): void {
        const self = this.getWritable();
        self.__upload = upload;
    }

    getError(): unknown | undefined {
        const self = this.getLatest();
        return self.__error;
    }

    setError(error: unknown): void {
        const self = this.getWritable();
        self.__error = error;
    }

    // @ts-expect-error
    exportJSON(): SerializedAssetNode {
        return {
            ...super.exportJSON(),
            __asset: this.getAsset(),
            type: AssetNode.getType(),
            version: 1,
        };
    }

    static importDOM(): { img: () => { conversion: typeof $convertImageElement; priority: number } } {
        return {
            img: () => ({
                conversion: $convertImageElement,
                priority: 0,
            }),
        };
    }
}

interface SerializedAssetNode extends SerializedLexicalNode {
    __asset: Asset;
    type: string;
    version: number;
}

interface LinkNodeProps {
    type: string;
    path: string;
    projectMapId?: string;
    nodeId?: string;
    dynamicInputValues?: Record<string, string>;
}

class LinkNode extends ElementNode {
    __link: LinkNodeProps;

    constructor(props: LinkNodeProps, key?: string) {
        super(key);
        this.__link = props;
    }

    static getType(): string {
        return "link";
    }

    getLink(): LinkNodeProps {
        return this.getLatest().__link;
    }

    setLink(link: LinkNodeProps): void {
        const writable = this.getWritable();
        writable.__link = link;
    }

    static clone(node: LinkNode): LinkNode {
        return new LinkNode(node.__link, node.__key);
    }

    // @ts-expect-error
    exportJSON(): SerializedLinkNode {
        return {
            ...super.exportJSON(),
            link: this.getLink(),
            type: LinkNode.getType(),
            version: 1,
        };
    }

    static importDOM(): { a: () => { conversion: typeof convertAnchorElement; priority: number } } {
        return {
            a: () => ({
                conversion: convertAnchorElement,
                priority: 1,
            }),
        };
    }

    canInsertTextBefore(): boolean {
        return false;
    }

    canInsertTextAfter(): boolean {
        return false;
    }

    canBeEmpty(): boolean {
        return false;
    }

    isInline(): boolean {
        return true;
    }
}

interface SerializedLinkNode extends SerializedLexicalNode {
    link: LinkNodeProps;
    type: string;
    version: number;
}

function convertAnchorElement(domNode: HTMLAnchorElement): { node: LexicalNode | null } {
    let node: LexicalNode | null = null;

    if (!isHTMLAnchorElement(domNode)) {
        return { node };
    }

    const textContent = domNode.textContent;

    if (textContent === null || textContent === "") {
        return { node };
    }

    let path = domNode.getAttribute("href") || "";

    const type = guessLinkTypeFromPath(path);

    if (type === "email" && path.startsWith("mailto:")) {
        path = path.replace("mailto:", "");
    } else if (type === "tel" && path.startsWith("tel:")) {
        path = path.replace("tel:", "");
    } else if (type === "item" && path.startsWith("item:")) {
        path = path.replace("item:", "");

        const [projectMapId, nodeId, url] = path.split("|");
        const dynamicInputValues: Record<string, string> = {
            locale: "${locale}",
        };

        const value: LinkNodeProps = {
            type: "projectMapNode",
            path: url,
            projectMapId,
            nodeId,
            dynamicInputValues: {},
        };

        if (url.startsWith("/${locale}")) {
            value.dynamicInputValues = dynamicInputValues;
        }

        node = $applyNodeReplacement(new LinkNode(value));

        return { node };
    }

    node = $applyNodeReplacement(
        new LinkNode({
            type,
            path,
        })
    );

    return { node };
}

const guessLinkTypeFromPath = (path: string): string => {
    if (path) {
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return "url";
        }

        if (path.startsWith("mailto:") || path.includes("@")) {
            return "email";
        }

        if (path.startsWith("tel:") || path.startsWith("+")) {
            return "tel";
        }

        if (path.startsWith("item:")) {
            return "item";
        }
    }

    return "url";
};