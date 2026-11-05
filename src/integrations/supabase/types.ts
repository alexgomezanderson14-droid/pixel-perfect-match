export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { __InternalSupabase:{PostgrestVersion:"14.18"}; public:{Tables:{
penyes:{Row:{created_at:string;direccion:string|null;foto_url:string;id:string;lat:number;lng:number;nombre:string;tipo_musica:string;acepta_visitas:boolean;informacion:string;estado:string};Insert:{created_at?:string;direccion?:string|null;foto_url:string;id?:string;lat:number;lng:number;nombre:string;tipo_musica?:string;acepta_visitas?:boolean;informacion?:string;estado?:string};Update:{created_at?:string;direccion?:string|null;foto_url?:string;id?:string;lat?:number;lng?:number;nombre?:string;tipo_musica?:string;acepta_visitas?:boolean;informacion?:string;estado?:string};Relationships:[]};
actos:{Row:{id:string;dia:string;hora:string;titulo:string;descripcion:string;tipo:string;lugar:string;publicado:boolean;created_at:string};Insert:{id?:string;dia:string;hora?:string;titulo:string;descripcion?:string;tipo?:string;lugar?:string;publicado?:boolean;created_at?:string};Update:Partial<Database["public"]["Tables"]["actos"]["Insert"]>;Relationships:[]};
eventos:{Row:{id:string;penya_id:string|null;dia:string;hora:string;titulo:string;descripcion:string;lugar:string;publicado:boolean;created_at:string};Insert:{id?:string;penya_id?:string|null;dia:string;hora?:string;titulo:string;descripcion?:string;lugar?:string;publicado?:boolean;created_at?:string};Update:Partial<Database["public"]["Tables"]["eventos"]["Insert"]>;Relationships:[]};
site_content:{Row:{clave:string;valor:string;updated_at:string};Insert:{clave:string;valor?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["site_content"]["Insert"]>;Relationships:[]};
};Views:{[_ in never]:never};Functions:{[_ in never]:never};Enums:{[_ in never]:never};CompositeTypes:{[_ in never]:never}}};
type DB=Omit<Database,"__InternalSupabase">;type Public=DB[Extract<keyof DB,"public">];
export type Tables<T extends keyof Public["Tables"]>=Public["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Public["Tables"]>=Public["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Public["Tables"]>=Public["Tables"][T]["Update"];
export type Enums<T extends keyof Public["Enums"]>=Public["Enums"][T];
export const Constants={public:{Enums:{}}} as const;