import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Plus, Trash2, Upload, Save, ArrowLeft, Globe, EyeOff } from 'lucide-react';
import { RichTextEditor } from '../ui/RichTextEditor';

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
    location_detail?: string;
    location_link?: string;
    speakers: Speaker[];
    moderator: Speaker;
    minimum_donation?: string;
}

const formatCurrency = (value: string) => {
    if (!value) return '';
    const numberString = value.replace(/[^0-9]/g, '');
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const EditEvent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [enableMapLink, setEnableMapLink] = useState(false);
    const publishIntentRef = useRef<boolean | null>(null);

    // File states for uploads
    const [speakerFiles, setSpeakerFiles] = useState<{ [key: number]: File | null }>({});
    const [moderatorFile, setModeratorFile] = useState<File | null>(null);

    const { register, control, handleSubmit, reset, setValue, watch } = useForm<EventFormHelper>({
        defaultValues: {
            speakers: [{ name: '', title: '' }],
            moderator: { name: '', title: '' }
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "speakers"
    });

    useEffect(() => {
        if (id) {
            fetchEvent(id);
        }
    }, [id]);

    const fetchEvent = async (eventId: string) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;

            if (data) {
                // Determine speakers. The DB stores JSON, RHF needs array.
                const speakers = Array.isArray(data.speakers) ? data.speakers : [];
                // Moderator is simple object
                const moderator = data.moderator || { name: '', title: '' };

                // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
                const dateObj = new Date(data.date_time);
                // Adjust for local timezone offset if needed, but data.date_time is likely ISO string (UTC)
                // datetime-local expects local time, so we need to be careful.
                // A simple way is to use the ISO string slice, but that ignores timezone.
                // Better:
                const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

                reset({
                    title: data.title,
                    slug: data.slug,
                    category: data.category,
                    description: data.description,
                    date_time: localIso,
                    location: data.location,
                    location_detail: data.location_detail || '',
                    location_link: data.location_link || '',
                    speakers: speakers.length > 0 ? speakers : [{ name: '', title: '' }],
                    moderator: moderator,
                    minimum_donation: data.minimum_donation ? formatCurrency(data.minimum_donation.toString()) : ''
                });
                setIsPublished(!!data.is_published);
                setEnableMapLink(!!data.location_link && data.location_link.trim().length > 0);
            }
        } catch (error) {
            console.error("Error fetching event:", error);
            alert("Failed to load event data.");
            navigate('/admin/events');
        } finally {
            setLoading(false);
        }
    };

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

    const onSubmit = async (formData: EventFormHelper) => {
        if (!id) return;
        setSubmitting(true);
        // If a publish button was clicked, use that intent; otherwise keep current state
        const publishedState = publishIntentRef.current !== null ? publishIntentRef.current : isPublished;
        publishIntentRef.current = null; // reset after consuming
        try {
            let moderatorPhotoUrl = formData.moderator.photo_url;
            if (moderatorFile) {
                moderatorPhotoUrl = await uploadImage(moderatorFile);
            }

            const moderatorData = { ...formData.moderator, photo_url: moderatorPhotoUrl };

            const speakersData = await Promise.all(formData.speakers.map(async (speaker, index) => {
                let photoUrl = speaker.photo_url;
                if (speakerFiles[index]) {
                    photoUrl = await uploadImage(speakerFiles[index]!);
                }
                return { ...speaker, photo_url: photoUrl };
            }));

            const { error } = await supabase
                .from('events')
                .update({
                    title: formData.title,
                    slug: formData.slug,
                    category: formData.category,
                    description: formData.description,
                    date_time: new Date(formData.date_time).toISOString(),
                    location: formData.location,
                    location_detail: formData.location_detail,
                    location_link: enableMapLink ? formData.location_link : '',
                    speakers: speakersData,
                    moderator: moderatorData,
                    minimum_donation: formData.minimum_donation ? Number(formData.minimum_donation.replace(/\./g, '')) : 1000,
                    is_published: publishedState
                })
                .eq('id', id);

            if (error) throw error;

            setIsPublished(publishedState);
            alert(publishedState ? 'Event berhasil dipublish!' : 'Perubahan tersimpan.');
            navigate('/admin/dashboard?tab=events');
        } catch (error: any) {
            console.error("Error updating event:", error);
            alert('Error updating event: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/admin/dashboard?tab=events')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Edit Event</h2>
                <span className={`ml-1 px-2.5 py-1 text-xs font-semibold rounded-full ${isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {isPublished ? 'Published' : 'Draft'}
                </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Event Title</label>
                        <input {...register('title', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                        <input {...register('slug', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input {...register('category')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                        <input type="datetime-local" {...register('date_time', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Minimum Donation (IDR)</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                            <input
                                {...register('minimum_donation')}
                                onChange={(e) => {
                                    const formatted = formatCurrency(e.target.value);
                                    setValue('minimum_donation', formatted);
                                }}
                                placeholder="1.000"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2 pl-9"
                                type="text"
                                inputMode="numeric"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Default: 1.000</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <RichTextEditor
                        value={watch('description') || ''}
                        onChange={(val) => setValue('description', val, { shouldValidate: true })}
                        className="mt-1"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input {...register('location')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Location Detail (Optional)</label>
                    <textarea {...register('location_detail')} placeholder="Jl. Leuwi Panjang No.86, RT.01/RW.04..." rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2 text-sm text-gray-600"></textarea>
                    <p className="text-xs text-gray-500 mt-1">Full detailed address to show below the location name.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">Google Maps Link (Optional)</label>
                        <button
                            type="button"
                            onClick={() => setEnableMapLink(!enableMapLink)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enableMapLink ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableMapLink ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {enableMapLink && (
                        <div className="mt-4">
                            <input {...register('location_link')} placeholder="https://maps.app.goo.gl/..." type="url" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary border p-2 text-blue-600" />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to use default Google Maps search by Location name.</p>
                        </div>
                    )}
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
                            <div key={field.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-md relative">
                                <div className="flex-1 space-y-2">
                                    <input {...register(`speakers.${index}.name` as const, { required: true })} placeholder="Speaker Name" className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm" />
                                    <input {...register(`speakers.${index}.title` as const)} placeholder="Job Title" className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm" />

                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">
                                            <Upload size={14} />
                                            {speakerFiles[index] ? 'Change Photo' : 'Update Photo'}
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSpeakerFileChange(index, e)} />
                                        </label>
                                        {speakerFiles[index] ? (
                                            <span className="text-xs text-green-600 truncate max-w-[150px]">{speakerFiles[index]?.name}</span>
                                        ) : field.photo_url ? (
                                            <span className="text-xs text-blue-600 truncate max-w-[150px] flex items-center gap-1">Existing img</span>
                                        ) : null}
                                    </div>
                                </div>
                                <button type="button" onClick={() => { remove(index); const newFiles = { ...speakerFiles }; delete newFiles[index]; setSpeakerFiles(newFiles); }} className="text-red-500 hover:text-red-700 p-2 absolute top-2 right-2">
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
                                    {moderatorFile ? 'Change Photo' : 'Update Photo'}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setModeratorFile(e.target.files[0])} />
                                </label>
                                {moderatorFile && <span className="text-xs text-green-600 truncate max-w-[150px]">{moderatorFile.name}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    {/* Publish / Unpublish toggle */}
                    {!isPublished ? (
                        <button
                            type="submit"
                            disabled={submitting}
                            onClick={() => { publishIntentRef.current = true; }}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                            Publish Event
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={submitting}
                            onClick={() => { publishIntentRef.current = false; }}
                            className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <EyeOff size={18} />}
                            Jadikan Draft
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        onClick={() => { publishIntentRef.current = null; }}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg shadow hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};
