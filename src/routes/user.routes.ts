import { Router } from "express";
import * as UserController from "../controllers/user.controller";
import { verificarToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/dashboard", UserController.getDashboard);
router.get("/usuarios", UserController.getUsers);
router.get("/mecanicos", UserController.getMechanics);
router.get("/usuario/:id", UserController.getUser);
router.get("/mecanicos/:id", UserController.getMechanic);
router.get("/turnos/mis-reservas", verificarToken, UserController.getAppointmentsByUser);
router.get("/barrios", UserController.getBarrios);
router.get("/talleres", UserController.getTalleres);
router.put("/talleres/:id", UserController.updateTaller);
router.get("/mecanicos/barrio/:id", UserController.getBarriosById);
router.post("/login", UserController.loginUser);
router.get("/mecanicos/turnos/:taller_id{/:fecha}", UserController.getAvailableDates);
router.post("/turnos/:taller_id", verificarToken, UserController.createAppointment)
router.get("/profile", verificarToken, UserController.getProfile);
router.get("/profile/shop", verificarToken, UserController.getProfileShop);
router.post("/usuario", UserController.createUser);
router.post("/usuario/shop", UserController.createUserShop);
router.put("/usuario/shop", UserController.updateUserShop);
router.put("/turnos/precio/:id", verificarToken, UserController.updateAmount);
router.post("/pagos/:taller_id/create-preference", verificarToken, UserController.createPreference);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

export default router;
