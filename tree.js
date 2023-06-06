// Copyright (c) 2023 Joel Klinghed, see LICENSE file.

"use strict";

export const name = "tree";

export function complete(node_data, string) {
    function get_child_offset(node_data, node_offset, children, index) {
        const delta = index == 0 ? 0 : node_data.getUint32(node_offset + index * 4, false);
        return node_offset + (children + delta) * 4;
    }

    function get_leafs(leafs, max_leafs, string, node_data, node_offset) {
        if (leafs.length >= max_leafs)
            return;
        const head = node_data.getUint32(node_offset, false);
        if (head & 0x800000) {
            leafs.push(string);
        }
        const children = (head >> 24) & 0xff;
        for (let i = 0; i < children; i++) {
            const child_offset = get_child_offset(node_data, node_offset, children, i);
            const child_head = node_data.getUint32(child_offset, false);
            const next_string = string + String.fromCodePoint(child_head & 0x7fffff);
            get_leafs(leafs, max_leafs, next_string, node_data, child_offset);
        }
    }

    function swapCase(code_point) {
        if (code_point >= 0x40 && code_point <= 0x5a)
            return code_point | 0x20;
        if (code_point >= 0x61 && code_point <= 0x7a)
            return code_point & ~0x20;
        return code_point;
    }

    let node_offset = 0;
    let string_offset = 0;
    let base = '';
    while (node_offset < node_data.byteLength) {
        if (string_offset >= string.length) {
            const ret = [];
            get_leafs(ret, 100, base, node_data, node_offset);
            return ret;
        }
        const head = node_data.getUint32(node_offset, false);
        const children = (head >> 24) & 0xff;
        let i = 0;
        while (i < 2) {
            let c = string.codePointAt(string_offset);
            if (i == 1) {
                const tmp = swapCase(c);
                if (tmp == c) {
                    i++;
                    break;
                }
                c = tmp;
            }
            let low = 0;
            let high = children;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                const child_offset = get_child_offset(node_data, node_offset, children, mid);
                const child_head = node_data.getUint32(child_offset, false);
                const child_c = child_head & 0x7fffff;
                if (c == child_c) {
                    node_offset = child_offset;
                    string_offset += String.fromCodePoint(c).length;
                    base += String.fromCodePoint(child_c);
                    break;
                }
                if (c < child_c) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
            if (low < high)
                break;
            i++;
        }
        if (i == 2)
            break;
    }
    return [];
}
