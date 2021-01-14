export function isIntactComponent(vNode) {
    return !!vNode.type.Component;
}

export const cid = 'IntactVueNext';

const warn = console.warn;
const noop = () => {};
export function silentWarn() {
    console.warn = noop;
}
export function resetWarn() {
    console.warn = warn;
}
