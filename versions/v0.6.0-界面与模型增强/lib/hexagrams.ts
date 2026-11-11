/**
 * 六十四卦数据（旁参小单元用）
 *
 * 说明：这里只取每卦的通行象意，做一句白话提示；
 * 不展开占断、不涉及吉凶预测，界面上会明确标注"由问题与日期生成的参照"。
 */

export interface Hexagram {
  n: number;
  name: string;
  image: string;
  hint: string;
}

export const HEXAGRAMS: Hexagram[] = [
  { n: 1, name: "乾", image: "天行健，自强不息", hint: "先把方向立稳，再谈速度。" },
  { n: 2, name: "坤", image: "地势坤，厚德载物", hint: "顺势承接，比硬顶更省力。" },
  { n: 3, name: "屯", image: "初生之难，云雷屯", hint: "起步阶段难是常态，先搭好架子。" },
  { n: 4, name: "蒙", image: "山下出泉，蒙以养正", hint: "不懂就问，别急着下结论。" },
  { n: 5, name: "需", image: "云上于天，需而不进", hint: "时机未到，先把准备做足。" },
  { n: 6, name: "讼", image: "天水违行，讼", hint: "先分清分歧在哪，再谈输赢。" },
  { n: 7, name: "师", image: "地中有水，师", hint: "人多更要先把规矩说清楚。" },
  { n: 8, name: "比", image: "水地比，亲附", hint: "找对同行的人，比单打独斗重要。" },
  { n: 9, name: "小畜", image: "风行天上，小畜", hint: "小步积累，别求一步到位。" },
  { n: 10, name: "履", image: "上天下泽，履虎尾", hint: "小心试探，守住分寸。" },
  { n: 11, name: "泰", image: "天地交泰", hint: "通畅时正好推进，别拖着。" },
  { n: 12, name: "否", image: "天地不交，否", hint: "闭住的时候，先守住不变坏。" },
  { n: 13, name: "同人", image: "天与火，同人", hint: "把同类的人聚起来，事情会轻。" },
  { n: 14, name: "大有", image: "火在天上，大有", hint: "手里有余力，先想怎么用对。" },
  { n: 15, name: "谦", image: "地中有山，谦", hint: "留一点余地，路会宽。" },
  { n: 16, name: "豫", image: "雷出地奋，豫", hint: "有热情是好事，别忘了排日程。" },
  { n: 17, name: "随", image: "泽中有雷，随", hint: "跟对节奏，别逆着来。" },
  { n: 18, name: "蛊", image: "山下有风，蛊", hint: "旧账要理，才谈得上新局。" },
  { n: 19, name: "临", image: "泽上有地，临", hint: "靠近现场去看，判断更准。" },
  { n: 20, name: "观", image: "风行地上，观", hint: "先看别人怎么做，再动。" },
  { n: 21, name: "噬嗑", image: "雷电，噬嗑", hint: "卡住的地方要咬开，别绕。" },
  { n: 22, name: "贲", image: "山下有火，贲", hint: "把事说清楚，比说漂亮重要。" },
  { n: 23, name: "剥", image: "山附于地，剥", hint: "该收的时候收，别硬撑。" },
  { n: 24, name: "复", image: "地中有雷，复", hint: "回到正轨，从一件小事开始。" },
  { n: 25, name: "无妄", image: "天下雷行，无妄", hint: "少算计，按事情本来的样子来。" },
  { n: 26, name: "大畜", image: "天在山中，大畜", hint: "蓄力期别急着展示。" },
  { n: 27, name: "颐", image: "山下有雷，颐", hint: "管好输入：吃什么、听什么。" },
  { n: 28, name: "大过", image: "泽灭木，大过", hint: "梁太细了，要么加固要么换梁。" },
  { n: 29, name: "坎", image: "水洊至，习坎", hint: "险中求稳，一步一步过。" },
  { n: 30, name: "离", image: "明两作，离", hint: "看清了再亮剑。" },
  { n: 31, name: "咸", image: "山上有泽，咸", hint: "先感受对方，再谈主张。" },
  { n: 32, name: "恒", image: "雷风，恒", hint: "能长期做的，才值得开始。" },
  { n: 33, name: "遁", image: "天下有山，遁", hint: "退一步不丢人，是留余地。" },
  { n: 34, name: "大壮", image: "雷在天上，大壮", hint: "有劲要使在正处。" },
  { n: 35, name: "晋", image: "火地晋，明出地上", hint: "顺势前进，别恋战旧地。" },
  { n: 36, name: "明夷", image: "地火明夷", hint: "光被遮住时，先收敛养着。" },
  { n: 37, name: "家人", image: "风自火出，家人", hint: "先安内，再谈外。" },
  { n: 38, name: "睽", image: "上火下泽，睽", hint: "看法不同很正常，先把话说完。" },
  { n: 39, name: "蹇", image: "山上有水，蹇", hint: "路难走时，先找可借力的地方。" },
  { n: 40, name: "解", image: "雷水解", hint: "松开了就往下走，别回头翻旧账。" },
  { n: 41, name: "损", image: "山下有泽，损", hint: "减掉一点，反而更顺。" },
  { n: 42, name: "益", image: "风雷益", hint: "该加的时候加，别抠。" },
  { n: 43, name: "夬", image: "泽上于天，夬", hint: "该断的事，说明白再断。" },
  { n: 44, name: "姤", image: "天下有风，姤", hint: "忽然出现的机会，先辨再迎。" },
  { n: 45, name: "萃", image: "泽上于地，萃", hint: "人聚起来，先定规则。" },
  { n: 46, name: "升", image: "地中生木，升", hint: "一点点往上，别跳级。" },
  { n: 47, name: "困", image: "泽无水，困", hint: "困住时先保底，再谋出。" },
  { n: 48, name: "井", image: "木上有水，井", hint: "深挖一口井，比乱挖十口强。" },
  { n: 49, name: "革", image: "泽中有火，革", hint: "要改就改到点上，别只换皮。" },
  { n: 50, name: "鼎", image: "木上有火，鼎", hint: "换个容器，事情的性质就变了。" },
  { n: 51, name: "震", image: "洊雷，震", hint: "被惊到之后，先定神再看清。" },
  { n: 52, name: "艮", image: "兼山，艮", hint: "该停就停，停下来才有看见。" },
  { n: 53, name: "渐", image: "山上有木，渐", hint: "慢一点，反而到得稳。" },
  { n: 54, name: "归妹", image: "泽上有雷，归妹", hint: "从属关系里，先想清自己位置。" },
  { n: 55, name: "丰", image: "雷电皆至，丰", hint: "最亮的时候，也要留后手。" },
  { n: 56, name: "旅", image: "山上有火，旅", hint: "在别人的地盘上，客气是本事。" },
  { n: 57, name: "巽", image: "随风，巽", hint: "顺着风说，话才进得去。" },
  { n: 58, name: "兑", image: "丽泽，兑", hint: "把关系养好，事自然好谈。" },
  { n: 59, name: "涣", image: "风行水上，涣", hint: "人心散了，先找共同的事。" },
  { n: 60, name: "节", image: "泽上有水，节", hint: "给自己定个规矩和上限。" },
  { n: 61, name: "中孚", image: "泽上有风，中孚", hint: "诚意到不到位，别人感觉得到。" },
  { n: 62, name: "小过", image: "山上有雷，小过", hint: "小事可略过，大事别越界。" },
  { n: 63, name: "既济", image: "水在火上，既济", hint: "做成了，更要防它反弹。" },
  { n: 64, name: "未济", image: "火在水上，未济", hint: "还没完，别提前收工。" },
];

/** 简易字符串散列（确定性） */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** 由问题 + 日期生成卦象与六爻（确定性：同样输入得到同样结果） */
export function castHexagram(question: string, dateKey: string): {
  hexagram: Hexagram;
  lines: boolean[]; // true = 阳爻（从下往上）
  movingLine: number; // 动爻 1-6
} {
  const seed = hashString(`${question}::${dateKey}`);
  const hexagram = HEXAGRAMS[seed % 64];
  const lines: boolean[] = [];
  for (let i = 0; i < 6; i++) lines.push(((seed >> (i + 3)) & 1) === 1);
  const movingLine = (seed % 6) + 1;
  return { hexagram, lines, movingLine };
}
