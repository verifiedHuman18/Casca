import type { Request, Response } from 'express';
import { currentUser } from '../middleware/requireAuth';
import type { RegistryService } from '../services/RegistryService';
import { idSchema } from '../validation/common';
import {
  createClubSchema,
  createPositionSchema,
  studentSearchSchema,
  updateClubSchema,
  updatePositionSchema,
  updateStudentSchema,
} from '../validation/registrySchemas';
import { toClubDto, toPositionDto, toSectionDto, toStudentDto } from './registryMappers';

/** Parses the request, calls RegistryService, shapes the response. No business rules here. */
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  private id(req: Request): string {
    return idSchema.parse(req.params.id);
  }

  listSections = async (_req: Request, res: Response): Promise<void> => {
    res.json((await this.registry.listSections()).map(toSectionDto));
  };

  listClubs = async (_req: Request, res: Response): Promise<void> => {
    res.json((await this.registry.listClubs()).map(toClubDto));
  };

  getClub = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.registry.getClub(this.id(req)));
  };

  listClubMembers = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.registry.listClubMembers(this.id(req)));
  };

  createClub = async (req: Request, res: Response): Promise<void> => {
    const club = await this.registry.createClub(currentUser(req), createClubSchema.parse(req.body));
    res.status(201).json(toClubDto(club));
  };

  updateClub = async (req: Request, res: Response): Promise<void> => {
    const club = await this.registry.updateClub(
      currentUser(req),
      this.id(req),
      updateClubSchema.parse(req.body)
    );
    res.json(toClubDto(club));
  };

  listPositions = async (_req: Request, res: Response): Promise<void> => {
    res.json((await this.registry.listPositions()).map(toPositionDto));
  };

  createPosition = async (req: Request, res: Response): Promise<void> => {
    const position = await this.registry.createPosition(
      currentUser(req),
      createPositionSchema.parse(req.body)
    );
    res.status(201).json(toPositionDto(position));
  };

  updatePosition = async (req: Request, res: Response): Promise<void> => {
    const position = await this.registry.updatePosition(
      currentUser(req),
      this.id(req),
      updatePositionSchema.parse(req.body)
    );
    res.json(toPositionDto(position));
  };

  searchStudents = async (req: Request, res: Response): Promise<void> => {
    const { enrollmentNo, limit, offset } = studentSearchSchema.parse(req.query);
    const students = await this.registry.searchStudents(enrollmentNo, limit, offset);
    res.json(students.map(toStudentDto));
  };

  getStudent = async (req: Request, res: Response): Promise<void> => {
    res.json(toStudentDto(await this.registry.getStudent(this.id(req))));
  };

  updateStudent = async (req: Request, res: Response): Promise<void> => {
    const student = await this.registry.updateStudent(
      currentUser(req),
      this.id(req),
      updateStudentSchema.parse(req.body)
    );
    res.json(toStudentDto(student));
  };

  removeStudent = async (req: Request, res: Response): Promise<void> => {
    await this.registry.removeStudent(currentUser(req), this.id(req));
    res.status(204).end();
  };
}
