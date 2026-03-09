export interface User {
  id: string;
  name: string;
  email: string;
  role: 'trainee' | 'trainer' | 'admin';
  department: string;
  skills: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  aiPersonalityProfile: {
    strengths: string[];
    improvementAreas: string[];
    preferredLearningPace: 'fast' | 'medium' | 'slow';
    motivationFactors: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export class UserEntity implements User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public role: 'trainee' | 'trainer' | 'admin',
    public department: string,
    public skills: string[] = [],
    public learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' = 'visual',
    public aiPersonalityProfile = {
      strengths: [],
      improvementAreas: [],
      preferredLearningPace: 'medium' as const,
      motivationFactors: []
    },
    public createdAt: string = new Date().toISOString(),
    public updatedAt: string = new Date().toISOString()
  ) {}

  updateProfile(updates: Partial<User>): UserEntity {
    return new UserEntity(
      this.id,
      updates.name ?? this.name,
      updates.email ?? this.email,
      updates.role ?? this.role,
      updates.department ?? this.department,
      updates.skills ?? this.skills,
      updates.learningStyle ?? this.learningStyle,
      updates.aiPersonalityProfile ?? this.aiPersonalityProfile,
      this.createdAt,
      new Date().toISOString()
    );
  }

  isTrainer(): boolean {
    return this.role === 'trainer';
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  hasSkill(skill: string): boolean {
    return this.skills.includes(skill);
  }
}