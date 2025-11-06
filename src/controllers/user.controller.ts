import { Request, Response } from "express";
import * as User from "../models/user.model";
import { comparePassword } from "../utils/hash.utils";
import { signToken, verifyToken } from "../utils/jwt.utils";
import { sendEmail } from "../utils/sendEmail";

export const getDashboard = async (req: Request, res: Response) => { 
  const { desde, hasta } = req.query; 

  const fechaInicio = desde || "2025-01-01";
  const fechaFin = hasta || "2025-12-31";

  const  {
      periodo,
      talleresNuevos,
      turnosReservados,
      totalIngresos,
      resumenPorMes,
    }  = await User.getDashboard(fechaInicio as string, fechaFin as string);

  res.json({
      periodo,
      talleresNuevos,
      turnosReservados,
      totalIngresos,
      resumenPorMes,
    });
};

export const getUsers = async (_req: Request, res: Response) => {
  const { data, error } = await User.getAllUsers();

  res.json(data);
};

export const getMechanics = async (_req: Request, res: Response) => {
  const { data, error } = await User.getAllMechanics();

  res.json(data);
};

export const getMechanic = async (req: Request, res: Response) => {
  const { data, error } = await User.getMechanicById(parseInt(req.params.id));

  res.json(data);
};

export const getUser = async (req: Request, res: Response) => {
  const {data, error} = await User.getUserById(parseInt(req.params.id));

  if (error) {
    res.status(404).json({ message: "Usuario no encontrado" });
    return;
  }
  res.json(data);
};

export const createUser = async (req: Request, res: Response) => {
  const {data, error} = await User.createUser(req.body);
  if (error) {
    res.status(400).json({error: error})
  } else {
    res.status(201).json(data);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const user = await User.updateUser(parseInt(req.params.id), req.body);
  res.json(user);
};

export const getBarrios = async (req: Request, res: Response) => {
  const barrios = await User.getBarrios()
  res.status(200).json(barrios);
}

export const getTalleres = async (req: Request, res: Response) => {
    const {data, error} = await User.getTalleres()
  res.status(200).json(data);
}

export const getBarriosById = async (req: Request, res: Response) => {
  const barrioId = req.params.id
  const talleresByBarrio = await User.getTalleresByBarrioId(parseInt(barrioId))
  res.status(200).json(talleresByBarrio);

}

export const loginUser = async (req: Request, res: Response) => {
  const { email, contrasena } = req.body;
  const usuario = await User.getUserByEmail(email)
  console.log(usuario);
  
  if (usuario.data?.length == 0) {
    res.status(401).json({ message: 'Usuario no encontrado' });
  } 
  // const userInputPass = usuario.data;

  const contrasenaValida = await comparePassword(contrasena, usuario.data[0].contrasena)
  // res.status(215).json(usuario.data[0].contrasena || usuario)
  console.log(contrasenaValida, usuario.data[0].contrasena, contrasena);
  
  if (!contrasenaValida) {
    res.status(401).json({ message: 'contrasena incorrecta' });
  }

  const token = signToken(
    { id: usuario.data[0].id,
      rol_id: usuario.data[0].rol_id,
      email: usuario.data[0].email,
      telefono: usuario.data[0].telefono
       }
  );

  res.status(200).json({token})
}

export const deleteUser = async (req: Request, res: Response) => {
  await User.deleteUser(parseInt(req.params.id));
  res.status(204).send();
};

export const getProfile = async (req: Request, res: Response) => {
  // @ts-ignore → para acceder a req.usuario (set por el middleware)
  const user = req.usuario;
  
  const profile = await User.getProfile(user.id)

  // console.log( "PROFILE",profile);
  // if (profile?.data?[0]?.rol_id == 2) {

  // }
  res.status(200).json(profile)
  // try {
    // const { data, error } = await supabase
    //   .from("usuarios")
    //   .select("*")
    //   .eq("id", user.id)
    //   .single();

    // if (error) {
    //   return res.status(500).json({ message: "Error al obtener perfil", error: error.message });
    // }

    // return res.json({ perfil: data });
  // } catch (err: any) {
  //   return res.status(500).json({ message: "Error interno", error: err.message });
  // }
};

export const getProfileShop = async (req: Request, res: Response) => {
    // @ts-ignore → para acceder a req.usuario (set por el middleware)
  const user = req.usuario;

  const profileShop = await User.getProfileShop(user.id)
  res.status(200).json(profileShop)

}

export const createUserShop = async (req: Request, res: Response) => {
  const {usuario, taller} = await User.createUserShop(req.body);
  console.log("lat lng: ", req.body);
  
  
  if (!usuario || !taller) {
    res.status(400).json({error: "Hubo un error"})
  } else {
    res.status(201).json(taller);
  }
}; 

export const updateUserShop = async (req: Request, res: Response) => {
  const {data, error} = await User.updateUserShop(req.body);
  // console.log("lat lng: ", req.body);
  
  
  if (error) {
    res.status(400).json({error: "Hubo un error"})
  } else {
    res.status(201).json(data);
  }
}; 

export const createAppointment = async (req: Request, res: Response) => {
    // @ts-ignore → para acceder a req.usuario (set por el middleware)
    const user = req.usuario;
    const taller = parseInt(req.params.taller_id);
    const fecha = req.body.fecha;
    const hora = req.body.hora;
    
    const { data, error } = await User.createAppointment(user.id,taller, fecha, hora)

    await sendEmail(
      user.email,
      "Confirmación de tu reserva",
      `
        <h2>Reserva confirmada</h2>
        <p>Tu turno en el taller <strong>${taller}</strong> ha sido confirmado.</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p>Gracias por utilizar nuestro servicio 🚗</p>
      `
    );
      
    if (error) {
      res.status(400).json({error: "Hubo un error " + error})
      return;
    } else {
      res.status(200).json(data)
    }
}

export const getAvailableDates = async (req: Request, res: Response) => {
  // @ts-ignore → para acceder a req.usuario (set por el middleware)
  const user = req.usuario;
  const taller = parseInt(req.params.taller_id);
  const fecha = req.params.fecha
  
  const disponibles = await User.obtenerHorariosDisponibles(taller, fecha)

  res.status(200).json(disponibles)

}

export const getAppointmentsByUser = async (req: Request, res: Response) => {
  // @ts-ignore → lo setea verificarToken
  const user = req.usuario;
  const userId = user.id;
  const userRol = user.rol_id;

  
  // con division de roles
// try {
    let query;

    if (userRol === 1) {
      // Cliente: ver sus turnos
      query = await User.getClientAppointments(userId)
      
    } else if (userRol === 2) {
      // Taller: ver turnos que le reservaron
      query = await User.getShopAppointments(userId)
      console.log("QUERRYYY", query);
    } 


    res.status(200).json(query);

  // sin division de roles
    // const { data, error } = await User.getAppointmentsByUser(user.id);
    // if (error){
    //   res.status(400).json(error)
    // }
    // const reservasConInfo = await reservasConNombreTaller(data as dataMechanic[])
    
    // res.status(200).json(reservasConInfo)
}

export const updateAmount = async (req: Request, res: Response) => {
    // @ts-ignore → lo setea verificarToken
  const user = req.usuario;

  const { id } = req.params;
  const { precio } = req.body;

  const {data, error} = await User.updateAmount(parseInt(id), precio);
  console.log("informacion", {id, precio});
  console.log("UPDATE", {data, error});
  
  res.status(200).json(data)

}
 
export const createPreference = async (req: Request, res: Response) => {
  // @ts-ignore → lo setea verificarToken
  const user = req.usuario;
  const { turnoId } = req.body;

  // buscar turno del cliente
  const {data:turnos, error:errorTurno} = await User.getClientAppointmentById(turnoId,user.id)
  console.log("El turno: ", turnos,errorTurno);
  
  // crear registro de pago
  const { data: pagoInsert, error: errorInsert } = await User.createPaymentRecord(turnos?.id, user.id, turnos?.taller_id, turnos?.monto_asignado)
  
  const pagoId = pagoInsert?.id;
  console.log("El pago Id: ", pagoId);
  
  const referenciaMercadoPago = await User.createMercadoPagoPreference(turnos?.id,turnos?.monto_asignado, pagoId)
  console.log("REFE: ", referenciaMercadoPago);
  
  res.status(200).json({ preferenceId: referenciaMercadoPago });

  }

async function reservasConNombreTaller (reservas: dataMechanic[]){
const reservasConTaller = await Promise.all(
    reservas.map(async (reserva) => {
      const taller = await User.getMechanicById(reserva.taller_id) as any;
        
          return {
            ...reserva,
            taller_nombre: taller.data[0].nombre_taller,
            taller_direccion: taller.data[0].direccion // agregamos el campo
          };

    })  );

    return reservasConTaller
}

export interface AuthRequest extends Request {
  usuario?: any;
}

interface dataMechanic {
      id: number;
    cliente_id: number;
    taller_id: number;
    fecha: string;
    hora: string;
    estado: string
}
