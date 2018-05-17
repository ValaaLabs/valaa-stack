export default function getTypeInterfaces (typeIntro: Object) {
  if (typeIntro.getInterfaces) return typeIntro.getInterfaces();
  if (typeIntro._typeConfig && typeIntro._typeConfig.interfaces) {
    return typeIntro._typeConfig.interfaces();
  }
  return [];
}
