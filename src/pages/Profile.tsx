
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile, updateUserPassword, UserProfile } from '../utils/firebase';
import { useAuth } from '../utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AtSign, Key, User, Instagram, MessageSquare, Link as LinkIcon } from 'lucide-react';

// Profile form schema
const profileFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']),
  socialMedia: z.object({
    discord: z.string().optional(),
    instagram: z.string().optional(),
    other: z.object({
      name: z.string().optional(),
      url: z.string().url({ message: "Please enter a valid URL" }).optional(),
    }).optional(),
  }).optional(),
});

// Password change schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password" }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, isLoading, navigate]);
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: userProfile?.username || '',
      gender: userProfile?.gender || 'prefer-not-to-say',
      socialMedia: {
        discord: userProfile?.socialMedia?.discord || '',
        instagram: userProfile?.socialMedia?.instagram || '',
        other: {
          name: userProfile?.socialMedia?.other?.name || '',
          url: userProfile?.socialMedia?.other?.url || '',
        },
      },
    },
  });
  
  // Update form when userProfile changes
  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        username: userProfile.username || '',
        gender: userProfile.gender || 'prefer-not-to-say',
        socialMedia: {
          discord: userProfile.socialMedia?.discord || '',
          instagram: userProfile.socialMedia?.instagram || '',
          other: {
            name: userProfile.socialMedia?.other?.name || '',
            url: userProfile.socialMedia?.other?.url || '',
          },
        },
      });
    }
  }, [userProfile]);
  
  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) return;
    
    setUpdateLoading(true);
    try {
      const success = await updateUserProfile(currentUser.uid, {
        username: data.username,
        gender: data.gender,
        socialMedia: {
          discord: data.socialMedia?.discord,
          instagram: data.socialMedia?.instagram,
          other: {
            name: data.socialMedia?.other?.name,
            url: data.socialMedia?.other?.url,
          },
        },
      });
      
      if (success) {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setPasswordLoading(true);
    try {
      const success = await updateUserPassword(data.currentPassword, data.newPassword);
      
      if (success) {
        passwordForm.reset();
      }
    } catch (error) {
      toast.error('Failed to update password');
      console.error('Password update error:', error);
    } finally {
      setPasswordLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading profile...</div>
      </div>
    );
  }
  
  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-lg mb-4">You need to be signed in to view your profile</div>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }
  
  // Create user initials for avatar
  const getInitials = () => {
    if (userProfile.username) {
      return userProfile.username.charAt(0).toUpperCase();
    }
    return currentUser.email?.charAt(0).toUpperCase() || 'U';
  };
  
  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information and connected social media
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-center">{userProfile.username || 'User'}</CardTitle>
              <CardDescription className="text-center mt-1">
                {currentUser.email}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <span>Member since {userProfile.joinedAt?.toDate().toLocaleDateString() || 'N/A'}</span>
              </div>
              
              {userProfile.socialMedia?.discord && (
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-muted-foreground" />
                  <span>Discord: {userProfile.socialMedia.discord}</span>
                </div>
              )}
              
              {userProfile.socialMedia?.instagram && (
                <div className="flex items-center gap-2">
                  <Instagram size={16} className="text-muted-foreground" />
                  <span>Instagram: {userProfile.socialMedia.instagram}</span>
                </div>
              )}
              
              {userProfile.socialMedia?.other?.url && (
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} className="text-muted-foreground" />
                  <span>{userProfile.socialMedia.other.name || 'Other'}: {userProfile.socialMedia.other.url}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="profile">Profile Settings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile details and social media links
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <h3 className="font-medium">Social Media Links</h3>
                        
                        <FormField
                          control={profileForm.control}
                          name="socialMedia.discord"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discord Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Discord username" {...field} />
                              </FormControl>
                              <FormDescription>
                                Add your Discord username without the # and numbers
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="socialMedia.instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Instagram handle (without @)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid gap-4">
                          <FormField
                            control={profileForm.control}
                            name="socialMedia.other.name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Other Platform Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Name of platform (e.g. Twitter, LinkedIn)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="socialMedia.other.url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Other Platform URL</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://example.com/your-profile" 
                                    type="url"
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Full URL to your profile on this platform
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={updateLoading || !profileForm.formState.isDirty}
                      >
                        {updateLoading ? 'Updating...' : 'Save Profile Changes'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Update your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your current password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your new password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Password must be at least 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm your new password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={passwordLoading || !passwordForm.formState.isDirty}
                      >
                        {passwordLoading ? 'Updating Password...' : 'Update Password'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
