import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "../store/useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { addDaysToDate, getTodayDateString, parseLocalDateKey } from "./date";
import { setIdealWeekHighlight } from "./idealWeekHighlight";

const today = getTodayDateString();
beforeEach(() => {
  useMonkStore.setState(createInitialState());
  useMonkStore.getState().setSeasonDuration(30);
  useMonkStore.getState().createSeasonFromOnboarding();
  useMonkStore.setState({appSettings:{...useMonkStore.getState().appSettings,idealWeek:[{id:"work",title:"Deep Work",startTime:"09:00",duration:60,days:[0,1,2,3,4,5,6],category:"deep_work",flexible:true}]}});
});
describe("Ideal Week daily highlight",()=>{
  it("sets the requested day's highlight without changing its Main Action, Agenda, or routine",()=>{
    useMonkStore.getState().createOrUpdateDayPlan(today,{dayType:"goal",mainAction:"Ship",agenda:["Call"],planningCompleted:true,timeBlocks:[]});
    const before=useMonkStore.getState().dayPlans.find(p=>p.date===today)!;
    const routine=useMonkStore.getState().appSettings.idealWeek;
    setIdealWeekHighlight("work",today);
    expect(useMonkStore.getState().dayPlans.find(p=>p.date===today)).toMatchObject({...before,highlight:"Deep Work",updatedAt:expect.any(String)});
    expect(useMonkStore.getState().appSettings.idealWeek).toBe(routine);
  });
  it("creates the selected future day's plan and protects an existing highlight until replacement is explicit",()=>{
    const date=addDaysToDate(today,1);
    setIdealWeekHighlight("work",date);
    expect(useMonkStore.getState().dayPlans.find(p=>p.date===date)?.highlight).toBe("Deep Work");
    useMonkStore.getState().saveDayTimeBlocks(date,[],false,"Old highlight");
    expect(()=>setIdealWeekHighlight("work",date)).toThrow("highlight-exists");
    setIdealWeekHighlight("work",date,true);
    expect(useMonkStore.getState().dayPlans.find(p=>p.date===date)?.highlight).toBe("Deep Work");
  });
  it("rejects missing activities and dates outside the activity or season",()=>{
    expect(()=>setIdealWeekHighlight("missing",today)).toThrow();
    expect(()=>setIdealWeekHighlight("work","invalid")).toThrow();
    expect(()=>setIdealWeekHighlight("work",addDaysToDate(today,1000))).toThrow();
    const state=useMonkStore.getState();
    useMonkStore.setState({appSettings:{...state.appSettings,idealWeek:state.appSettings.idealWeek!.map(b=>({...b,days:[(parseLocalDateKey(today).getDay()+1)%7]}))}});
    expect(()=>setIdealWeekHighlight("work",today)).toThrow();
  });
});
