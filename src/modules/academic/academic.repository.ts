import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AcademicRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // TAXONOMY (Tag, Skill, Specialization)
  // ------------------------------------------------------

  async createTag(data: Prisma.TagCreateInput) {
    return this.prisma.tag.create({ data });
  }
  async findTags() {
    return this.prisma.tag.findMany();
  }

  async createSkill(data: Prisma.SkillCreateInput) {
    return this.prisma.skill.create({ data });
  }
  async findSkills() {
    return this.prisma.skill.findMany();
  }

  async createSpecialization(data: Prisma.SpecializationCreateInput) {
    return this.prisma.specialization.create({ data });
  }
  async findSpecializations() {
    return this.prisma.specialization.findMany();
  }

  // ------------------------------------------------------
  // STRUCTURE (Stage, Level, Department, Branch)
  // ------------------------------------------------------
  async createStage(data: Prisma.EducationalStageCreateInput) {
    return this.prisma.educationalStage.create({ data });
  }
  async findStages() {
    return this.prisma.educationalStage.findMany({
      where: { deletedAt: null },
      include: { levels: true },
    });
  }
  async updateStage(id: string, data: Prisma.EducationalStageUpdateInput) {
    return this.prisma.educationalStage.update({ where: { id }, data });
  }
  async softDeleteStage(id: string) {
    return this.prisma.educationalStage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createLevel(data: Prisma.LevelUncheckedCreateInput) {
    return this.prisma.level.create({ data });
  }
  async findLevels() {
    return this.prisma.level.findMany({ where: { deletedAt: null } });
  }

  async createDepartment(data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({ data });
  }
  async findDepartments() {
    return this.prisma.department.findMany({
      where: { deletedAt: null },
      include: { branches: true },
    });
  }

  async createBranch(data: Prisma.BranchUncheckedCreateInput) {
    return this.prisma.branch.create({ data });
  }

  // ------------------------------------------------------
  // SUBJECTS & SUBJECT GROUPS
  // ------------------------------------------------------
  async createSubjectGroup(data: Prisma.SubjectGroupCreateInput) {
    return this.prisma.subjectGroup.create({ data });
  }
  async findSubjectGroups() {
    return this.prisma.subjectGroup.findMany({ where: { deletedAt: null } });
  }

  async createSubject(data: Prisma.SubjectUncheckedCreateInput) {
    return this.prisma.subject.create({ data });
  }
  async findSubjects(skip?: number, take?: number) {
    return this.prisma.subject.findMany({
      where: { deletedAt: null },
      skip,
      take,
    });
  }
  async updateSubject(id: string, data: Prisma.SubjectUncheckedUpdateInput) {
    return this.prisma.subject.update({ where: { id }, data });
  }
  async softDeleteSubject(id: string) {
    return this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ------------------------------------------------------
  // TIME (AcademicYear, Semester, Calendar)
  // ------------------------------------------------------
  async createAcademicYear(data: Prisma.AcademicYearCreateInput) {
    return this.prisma.academicYear.create({ data });
  }
  async findAcademicYears() {
    return this.prisma.academicYear.findMany({
      where: { deletedAt: null },
      include: { semesters: true },
    });
  }

  async createSemester(data: Prisma.SemesterUncheckedCreateInput) {
    return this.prisma.semester.create({ data });
  }

  async createCalendarEvent(data: Prisma.AcademicCalendarCreateInput) {
    return this.prisma.academicCalendar.create({ data });
  }
  async findCalendarEvents() {
    return this.prisma.academicCalendar.findMany();
  }

  // ------------------------------------------------------
  // LEARNING PATHS
  // ------------------------------------------------------
  async createLearningPath(data: Prisma.LearningPathCreateInput) {
    return this.prisma.learningPath.create({ data });
  }
  async findLearningPaths() {
    return this.prisma.learningPath.findMany({ where: { deletedAt: null } });
  }
  async updateLearningPath(id: string, data: Prisma.LearningPathUpdateInput) {
    return this.prisma.learningPath.update({ where: { id }, data });
  }
  async softDeleteLearningPath(id: string) {
    return this.prisma.learningPath.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
