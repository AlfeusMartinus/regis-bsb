import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';

interface Speaker {
    name: string;
    title: string;
    photo_url?: string;
}

interface EventFormHelper {
    title: string;
    slug: string;
    category: string;
    description: string;
    date_time: string;
    location: string;
    speakers: Speaker[];
    moderator: Speaker;
}

export const CreateEvent: React.FC = () => {
    const { register, control, handleSubmit, formState: { errors }, watch } = useForm<EventFormHelper>({
        defaultValues: {
            speakers: [{ name: '', title: '' }],
            moderator: { name: '', title: '' }
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "speakers"
    });

    const [submitting, setSubmitting] = useState(false);

    // File states for uploads (using simple state for now since React Hook Form file handling can be complex)
    const [speakerFiles, setSpeakerFiles] = useState<{ [key: number]: File | null }>({});
    const [moderatorFile, setModeratorFile] = useState<File | null>(null);

    const navigate = useNavigate();

    // Helper to upload image
    const uploadImage = async (file: File, bucket: string = 'event-images'): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

        if (uploadError) {
            console.error("Upload error:", uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSpeakerFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSpeakerFiles(prev => ({ ...prev, [index]: e.target.files![0] }));
        }
    };

    const onSubmit = async (data: EventFormHelper) => {
        setSubmitting(true);
        try {
            // Upload Moderator Image
            let moderatorPhotoUrl = data.moderator.photo_url;
            if (moderatorFile) {
                moderatorPhotoUrl = await uploadImage(moderatorFile);
            }

            const moderatorData = { ...data.moderator, photo_url: moderatorPhotoUrl };

            // Upload Speaker Images
            const speakersData = await Promise.all(data.speakers.map(async (speaker, index) => {
                let photoUrl = speaker.photo_url;
                if (speakerFiles[index]) {
                    photoUrl = await uploadImage(speakerFiles[index]!);
                }
                return { ...speaker, photo_url: photoUrl };
            }));

            const { error } = await supabase.from('events').insert({
                title: data.title,
                slug: data.slug,
                category: data.category,
                description: data.description,
                date_time: new Date(data.date_time).toISOString(),
                location: data.location,
                speakers: speakersData,
                moderator: moderatorData,
                is_published: true // Auto publish for now
            });

            if (error) throw error;
            navigate('/admin/events');
        } catch (error: any) {
            console.error("Error creating event:", error);
            alert('Error creating event: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Create New Event</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Event Title</label>
                        <input {...register('title', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                        <input {...register('slug', { required: true })} placeholder="my-awesome-event" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input {...register('category')} placeholder="Webinar" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                        <input type="datetime-local" {...register('date_time', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea {...register('description')} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2"></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input {...register('location')} placeholder="Zoom Meeting / Jakarta" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                </div>

                {/* Speakers */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Speakers</label>
                        <button type="button" onClick={() => append({ name: '', title: '' })} className="text-sm text-primary flex items-center hover:underline">
                            <Plus size={16} /> Add Speaker
                        </button>
                    </div>
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-md">
                                <div className="flex-1 space-y-2">
                                    <input {...register(`speakers.${index}.name` as const, { required: true })} placeholder="Speaker Name" className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm" />
                                    <input {...register(`speakers.${index}.title` as const)} placeholder="Job Title" className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm" />

                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">
                                            <Upload size={14} />
                                            {speakerFiles[index] ? 'Change Photo' : 'Upload Photo'}
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSpeakerFileChange(index, e)} />
                                        </label>
                                        {speakerFiles[index] && <span className="text-xs text-green-600 truncate max-w-[150px]">{speakerFiles[index]?.name}</span>}
                                    </div>
                                </div>
                                <button type="button" onClick={() => { remove(index); const newFiles = { ...speakerFiles }; delete newFiles[index]; setSpeakerFiles(newFiles); }} className="text-red-500 hover:text-red-700 p-2">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Moderator */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Moderator</label>
                    <div className="flex gap-4 items-start bg-gray-50 p-4 rounded-md">
                        <div className="flex-1 space-y-2">
                            <input {...register('moderator.name', { required: true })} placeholder="Moderator Name" className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm" />
                            <input {...register('moderator.title')} placeholder="Job Title" className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm" />

                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">
                                    <Upload size={14} />
                                    {moderatorFile ? 'Change Photo' : 'Upload Photo'}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setModeratorFile(e.target.files[0])} />
                                </label>
                                {moderatorFile && <span className="text-xs text-green-600 truncate max-w-[150px]">{moderatorFile.name}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="animate-spin" /> : 'Publish Event'}
                    </button>
                </div>
            </form>
        </div>
    );
};
