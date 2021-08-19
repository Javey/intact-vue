export function isIntactComponent(vNode) {
    // don't convert Intact functional component to Intact vNode,
    // because it's propTypes are missing
    return !!vNode.type.Component; // || vNode.type.cid === cid;
}

export const cid = 'IntactVueNext';

const warn = console.warn;
export const noop = () => {};
export function silentWarn() {
    console.warn = noop;
}
export function resetWarn() {
    console.warn = warn;
}
