export const TYPES = {
    UNIT: "unit", TANK: "tank", FACILITY: "facility",
    SPELL: "spell", MAGIC: "magic",
  };
  
  export const ATTRS = {
    NONE: "none", MACHINE: "machine", DRAGON: "dragon",
    WALL: "wall", EARTH: "earth", GRASS: "grass", BUG: "bug",
  };
  
  export const ATTR_LABELS = {
    none:"", machine:"機", dragon:"龍", wall:"壁",
    earth:"土", grass:"草", bug:"虫",
  };
  
  export const GENERATORS = { WATER:"water", FIRE:"fire", WIND:"wind" };
  
  export const GENERATOR_INFO = {
    water: { name:"水力発電", desc:"毎ターン+3（安定）" },
    fire:  { name:"火力発電", desc:"1,4,7…T目+6 / 他+1" },
    wind:  { name:"風力発電", desc:"毎ターン0〜6ランダム" },
  };
  
  export const RANGE_TYPE = { RECT:"rect", DIAMOND:"diamond" };
  export const MAX_TURNS = 25;
  
  export function getGeneratorCost(type, turn) {
    if (type === "fire") return turn % 3 === 1 ? 6 : 1;
    if (type === "wind") return Math.floor(Math.random() * 7);
    return 3;
  }