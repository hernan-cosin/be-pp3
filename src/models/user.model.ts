import { pool, supabase } from "../db/pool";
import { hashPassword } from "../utils/hash.utils";
import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export const getDashboard = async (fechaInicio:string,  fechaFin:string) => {
  // 🧰 1️⃣ Talleres nuevos en el período
    const { count: talleresNuevos, error: errTalleres } = await supabase
      .from("talleres")
      .select("*", { count: "exact", head: true })
      .gte("creado_en", fechaInicio)
      .lte("creado_en", fechaFin);

    // 📅 2️⃣ Turnos reservados
    const { count: turnosReservados, error: errTurnos } = await supabase
      .from("turnos")
      .select("*", { count: "exact", head: true })
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    // 💰 3️⃣ Total de ingresos
    const { data: turnosData, error: errSuma } = await supabase
      .from("turnos")
      .select("fecha, monto_asignado")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (errTalleres || errTurnos || errSuma) {
      console.error(errTalleres || errTurnos || errSuma);
      // return res.status(400).json({ message: "Error al obtener datos" });
      return { message: "Error al obtener datos" };
    }

    // Calcular suma total
    const totalIngresos =
      turnosData?.reduce((acc, t) => acc + (t.monto_asignado || 0), 0) || 0;

    // 📈 4️⃣ Agrupar por mes
    const resumenPorMes = turnosData?.reduce((acc, t) => {
      if (!t.fecha) return acc;
      const mes = new Date(t.fecha).toLocaleString("es-AR", {
        month: "short",
        year: "numeric",
      });
      const existente = acc.find((x) => x.mes === mes);
      if (existente) {
        existente.turnos += 1;
        existente.ingresos += t.monto_asignado || 0;
      } else {
        acc.push({ mes, turnos: 1, ingresos: t.monto_asignado || 0 });
      }
      return acc;
    }, [] as { mes: string; turnos: number; ingresos: number }[]);

    
  return {
      periodo: { desde: fechaInicio, hasta: fechaFin },
      talleresNuevos,
      turnosReservados,
      totalIngresos,
      resumenPorMes,
    };
};

export const getAllUsers = async () => {
  const { data, error } = await supabase.from("usuarios").select();

  return { data, error };
};

export const getAllMechanics = async () => {
  const { data, error } = await supabase.from("talleres").select();

  return { data, error };
};

export const getUserById = async (id: number) => {
  const { data, error } = await supabase.from("usuarios").select().eq("id", id);

  return { data, error };
};

type User = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  contrasena: string;
  rol_id: number;
};
type UserResponse = {
  data: User[];
  error: any;
};
export const getUserByEmail = async (email: string): Promise<UserResponse> => {
  const { data, error } = (await supabase
    .from("usuarios")
    .select()
    .eq("email", email)) as UserResponse;

  return { data, error };
};

export const getMechanicById = async (id: number) => {
  const { data, error } = await supabase.from("talleres").select().eq("id", id);

  return { data, error };
};

export const getBarrios = async () => { 
   const { data, error } = await supabase
      .from("barrios")
      .select("*")
      .order("nombre", { ascending: true });

  return { data, error };

}

export const getTalleres = async ()=>{
     const { data, error } = await supabase
      .from("talleres")
      .select(`
    id,
    nombre_taller,
    direccion,
    barrio_id,
    latitud,
    longitud,
    barrio_id(nombre)`)
      .order("barrio_id", { ascending: true });

  return { data, error };
}

export const getTalleresByBarrioId = async (id:number)=>{
  const { data, error } = await supabase.from("talleres").select(`
    id,
    nombre_taller,
    direccion,
    barrio_id,
    latitud,
    longitud,
    barrio_id(nombre)`).eq("barrio_id", id);
return {data,error}
}

export const obtenerHorariosDisponibles = async (tallerId: number, fecha: string) => {
  const { data, error } = await getMechanicById(tallerId) as any;
  const occupied = await obtenerHorariosOcupados(tallerId, fecha) as any;

  const horasOcupadas = occupied.data?.map((t: { hora: Date; })=>{return t.hora});
  
  let horario_inicio = data[0].horario_inicio;
  let horario_fin = data[0].horario_fin;
  // let duracion_turno = data[0].duracion_turno;

  let horarioInicioParaSumar = new Date(`${fecha}T${horario_inicio}`).getHours()
  let horarioFinParaSumar = new Date(`${fecha}T${horario_fin}`).getHours()
  
  const disponibles: string[] = [];

  while (horarioInicioParaSumar < horarioFinParaSumar) {  
    let horaString = formatNumberToTime(parseInt(horario_inicio))

    if (!horasOcupadas.includes(horaString)) {    
      disponibles.push(horaString);
    }    

    horarioInicioParaSumar = horarioInicioParaSumar+1
    horario_inicio = parseInt(horario_inicio)+1
  
    }
  
  return disponibles;
};

export const obtenerHorariosOcupados = async (tallerId: number, fecha: string) => {
  const { data, error } = await supabase
    .from("turnos")
    .select()
    .eq("taller_id", tallerId).eq("fecha", fecha);
  
  return { data, error };
};

export const createUser = async (user: {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  contrasena: string;
  rol_id: number;
}) => {
  const hashedPassword = await hashPassword(user.contrasena);
  console.log("CONTRA HASHEADA", hashedPassword);
  
  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      contrasena: hashedPassword,
      rol_id: user.rol_id,
    })
    .select();

  return { data, error };
};

export const updateUser = async (
  id: number,
  userInfo: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    // contrasena: string;
    rol_id: number;
  }
) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update(userInfo)
    .eq("id", id)
    .select();

  return { data, error };
};

export const deleteUser = async (id: number) => {
  await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
};

export const getProfile = async (id: number) => {
  const { data, error } = await getUserById(id);

  return { data, error };
};

export const getProfileShop = async (id: number) => {
  const { data, error } = await supabase
    .from("talleres")
    .select()
    .eq("usuario_id", id)

  return { data, error };
};

export const createUserShop = async (user: {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  contrasena: string;
  rol_id: number;
  nombre_taller: string;
  ciudad: string;
  direccion: string;
  barrio_id: number;
  horario_inicio: number;
  horario_fin: number;
  duracion_turno: number;
  dias_laborales: string[];
  latitud: number;
  longitud: number;
}) => {

  const { data: createdUser, error: userError } = await createUser({
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    telefono: user.telefono,
    contrasena: user.contrasena,
    rol_id: user.rol_id,
  })

    if (!createdUser || createdUser.length === 0) throw new Error('No se insertó usuario')

    const userId = createdUser?.[0]?.id;

  const { data: tallerData, error: tallerError } = await supabase
  .from('talleres')
  .insert({
    usuario_id: userId,
    nombre_taller:user.nombre_taller,
    ciudad:user.ciudad,
    direccion:user.direccion,
    barrio_id:user.barrio_id,
    horario_inicio:user.horario_inicio,
    horario_fin:user.horario_fin,
    duracion_turno:user.duracion_turno,
    dias_laborales:user.dias_laborales,
    latitud: user.latitud,
    longitud: user.longitud
  })
  .select()
  
  if (tallerError) {console.log(tallerError)}
  if (!tallerData || tallerData.length === 0) throw new Error('No se pudo crear taller '+tallerError)

  // console.log("DATA101", createdUser);
  return {
    usuario: createdUser[0],
    taller: tallerData[0],
  }
};

export const updateUserShop = async (taller: User) => {
  const {data, error}= await supabase.from("talleres").update(taller).select();
  return {data, error}
}

export const createAppointment = async (usuario_id:number,taller_id:number, fecha: string, hora: string) => {
  const { data, error } = await supabase
    .from("turnos")
    .insert({
      cliente_id: usuario_id,
      taller_id: taller_id,
      fecha: fecha,
      hora: hora
    }).select();
    
    return { data, error };

}

export const getAppointmentsByUser = async(usuario_id:number)=>{
  const { data, error } = await supabase
    .from("turnos")
    .select()
    .eq("cliente_id", usuario_id);

  return { data, error };
}

export const getClientAppointments = async(usuario_id:number)=>{
  const { data, error } = await supabase
        .from("turnos")
        .select(`
          id, fecha, hora, estado, monto_asignado,
          talleres (id, nombre_taller, direccion)
        `)
        .eq("cliente_id", usuario_id)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: true });

  return { data, error };
}

export const getClientAppointmentById = async (id:number,userId:number) =>{
  const { data: turnos, error: errorTurno } = await supabase
      .from("turnos")
      .select("id, taller_id, monto_asignado")
      .eq("id", id)
      .eq("cliente_id", userId)
      .single();
  
  return {data:turnos,error:errorTurno}
}

export const createPaymentRecord = async (turnoId:number, userId:number, tallerId:number, montoAsignado:number)=> {
  const { data: pagoInsert, error: errorInsert } = await supabase
      .from("pagos")
      .insert([
        {
          turno_id: turnoId,
          cliente_id: userId,
          taller_id: tallerId,
          amount: montoAsignado,
          currency: "ARS"
        },
      ])
      .select("id")
      .single();
    
      return {data: pagoInsert, error: errorInsert}
}

export const createMercadoPagoPreference = async (turnoId: number, amount:number, pagoId:number) => {
  const preference = new Preference(client);
  console.log("preference: ", preference);
  console.log("props: ", {turnoId, amount, pagoId});
  
try {
  const mpResponse = await preference.create({
    body: {
        items: [
          {
            id: String(turnoId),
            title: `Pago turno #${turnoId}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: amount,
          },
        ],
        external_reference: String(pagoId),
        // back_urls: {
        //   success: "http://localhost:3000/pagos/success",
        //   failure: "http://localhost:3000/pagos/failure",
        // },
        // auto_return: "approved",
      }
  });


// 4. Guardar preference_id en la tabla pagos
await supabase
  .from("pagos")
  .update({ preference_id: mpResponse.id })
  .eq("id", pagoId);

  return mpResponse.id
} catch (e) {
  console.log("error: ", e);
  
}
}

export const getShopAppointments = async(usuario_id:number)=>{
  const getTallerId = await supabase.from("talleres").select("id").eq("usuario_id", usuario_id);
  const tallerId = getTallerId.data?.[0].id;

  const { data, error } = await supabase
        .from("turnos")
        .select(`
          id, fecha, hora, estado, monto_asignado,
          usuarios!turnos_cliente_id_fkey (id, nombre, apellido, telefono)
        `)
        .eq("taller_id", tallerId)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

  return { data, error };
}

export const updateAmount = async (id:number, amount:number)=>{
    const { data, error } = await supabase
      .from("turnos")
      .update({monto_asignado: amount})
      .eq("id", id)
      .select()

    return {data, error}
}

function formatNumberToTime(hour: number): string {
  // Ensure the hour is an integer between 0 and 23 (optional validation)
  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23');
  }
  
  const hh = Math.floor(hour).toString().padStart(2, '0');
  return `${hh}:00:00`;
}