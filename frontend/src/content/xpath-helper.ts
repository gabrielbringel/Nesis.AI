// Helpers para extração via XPath no DOM do eSUS.
//
// O eSUS APS usa CSS-in-JS com classes voláteis (css-1ylu0bo, css-1juhwne...),
// então XPaths estruturais são mais estáveis do que seletores CSS.

export function getByXPath(xpath: string): string | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )
  const node = result.singleNodeValue
  return node ? node.textContent?.trim() || null : null
}

export function getAllByXPath(xpath: string): Element[] {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  )
  const items: Element[] = []
  for (let i = 0; i < result.snapshotLength; i++) {
    const node = result.snapshotItem(i)
    if (node) items.push(node as Element)
  }
  return items
}
