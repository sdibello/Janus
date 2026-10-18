import definitions from '../../shared/conditions.json'

export const conditionDefinitions = definitions
export type ConditionKind = (typeof definitions)[number]['kind']
const byKind = new Map(definitions.map((definition) => [definition.kind, definition]))

export function conditionLabel(kind: ConditionKind) {
  return byKind.get(kind)?.label ?? kind
}

export function conditionDefinition(kind: ConditionKind) {
  return byKind.get(kind)
}
