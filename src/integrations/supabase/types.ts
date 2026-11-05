export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type PenyaInsert={created_at?:string;direccion?:string|null;foto_url:string;id?:string;lat:number;lng:number;nombre:string;tipo_musica?:string;informacion?:string;estado?:string;instagram?:string;email?:string|null};
type ActoInsert={id?:string;dia:string;hora?:string;titulo:string;descripcion?:string;tipo?:string;lugar?:string;lat?:number|null;lng?:number|null;imagen_url?:string|null;publicado?:boolean;created_at?:string};
type EventoInsert={id?:string;penya_id?:string|null;dia:string;hora?:string;titulo:string;descripcion?:string;lugar?:string;lat?:number|null;lng?:number|null;publicado?:boolean;created_at?:string};
type SiteContentInsert={clave:string;valor?:string;updated_at?:string};
export type Database={__InternalSupabase:{PostgrestVersion:"14.18"};public:{Tables:{
penyes:{Row:PenyaInsert & {created_at:string;foto_url:string;id:string;lat:number;lng:number;nombre:string;tipo_musica:string;informacion:string;estado:string;instagram:string;email:string|null};Insert:PenyaInsert;Update:Partial<PenyaInsert>;Relationships:[]};
actos:{Row:{id:string;dia:string;hora:string;titulo:string;descripcion:string;tipo:string;lugar:string;lat:number|null;lng:number|null;imagen_url:string|null;publicado:boolean;created_at:string};Insert:ActoInsert;Update:Partial<ActoInsert>;Relationships:[]};
eventos:{Row:{id:string;penya_id:string|null;dia:string;hora:string;titulo:string;descripcion:string;lugar:string;lat:number|null;lng:number|null;publicado:boolean;created_at:string};Insert:EventoInsert;Update:Partial<EventoInsert>;Relationships:[]};
site_content:{Row:{clave:string;valor:string;updated_at:string};Insert:SiteContentInsert;Update:Partial<SiteContentInsert>;Relationships:[]};
};Views:{[_ in never]:never};Functions:{[_ in never]:never};Enums:{[_ in never]:never};CompositeTypes:{[_ in never]:never}}};
type DB=Omit<Database,"__InternalSupabase">;type Public=DB[Extract<keyof DB,"public">];
export type Tables<T extends keyof Public["Tables"]>=Public["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Public["Tables"]>=Public["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Public["Tables"]>=Public["Tables"][T]["Update"];
export type Enums<T extends keyof Public["Enums"]>=Public["Enums"][T];
export const Constants={public:{Enums:{}}} as const;